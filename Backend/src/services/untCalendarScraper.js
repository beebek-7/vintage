import axios from 'axios';
import * as cheerio from 'cheerio';
import pool from '../config/db.js';

class UNTCalendarScraper {
  static parseDate(dateStr) {
    try {
      // Remove any text after "to" and trim
      const mainDate = dateStr.split('to')[0].trim();
      
      // Extract the date parts
      const match = mainDate.match(/([A-Za-z]+), ([A-Za-z]+) (\d+), (\d{4})(?: (\d+):?(\d+)?([ap]m))?/i);
      if (!match) {
        console.error('Date string does not match expected format:', dateStr);
        return null;
      }

      const [_, dayOfWeek, month, day, year, hours, minutes = '00', meridian] = match;
      
      // If no time was provided, use midnight
      if (!hours) {
        return new Date(`${month} ${day}, ${year} 00:00:00`);
      }

      // Convert 12-hour format to 24-hour
      let hour = parseInt(hours, 10);
      if (meridian.toLowerCase() === 'pm' && hour !== 12) {
        hour += 12;
      } else if (meridian.toLowerCase() === 'am' && hour === 12) {
        hour = 0;
      }

      // Create the date string in a format that PostgreSQL can understand
      const dateString = `${year}-${month}-${day.padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minutes}:00`;
      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        console.error('Invalid date created:', dateString);
        return null;
      }

      return date;
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
      return null;
    }
  }

  static async scrapeEvents() {
    try {
      console.log('Starting scrape...');
      let allEvents = [];
      
      // Scrape pages 1, 2, and 3
      for (let page = 1; page <= 3; page++) {
        const url = page === 1 
          ? 'https://calendar.unt.edu/calendar'
          : `https://calendar.unt.edu/calendar/${page}`;
          
        console.log(`Scraping page ${page}: ${url}`);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        const $ = cheerio.load(response.data);
        const pageEvents = [];

        // Find all events under #event_results
        $('#event_results .em-card').each((i, element) => {
          const $card = $(element);
          const $title = $card.find('.em-card_text h3 a');
          
          // Get event details
          const title = $title.text().trim();
          const dateText = $card.find('.em-card_event-text').first().text().trim();
          const locationLink = $card.find('a[href*="/location/"]');
          const location = locationLink.length ? locationLink.text().trim() : '';
          const link = $title.attr('href');
          
          // Get description
          const description = $card.find('.em-card_text p').text().trim();

          // Determine category based on card classes and content
          let category = 'GENERAL';
          const cardClasses = $card.attr('class') || '';
          const cardText = $card.text().toLowerCase();

          if (cardClasses.includes('athletics') || cardText.includes('fitness')) {
            category = 'SPORTS';
          } else if (cardClasses.includes('student-life') || cardText.includes('student life')) {
            category = 'CLUBS';
          } else if (cardClasses.includes('academic') || cardText.includes('lab') || cardText.includes('class')) {
            category = 'ACADEMIC';
          } else if (cardClasses.includes('arts') || cardText.includes('art') || cardText.includes('entertainment')) {
            category = 'ARTS';
          } else if (cardClasses.includes('career') || cardText.includes('career') || cardText.includes('job')) {
            category = 'CAREER';
          }

          // Extract tags
          const tags = [category.toLowerCase()];
          const titleLower = title.toLowerCase();
          if (titleLower.includes('lab')) tags.push('lab');
          if (titleLower.includes('class')) tags.push('class');
          if (titleLower.includes('fitness')) tags.push('fitness');
          if (titleLower.includes('recreation')) tags.push('recreation');
          if (location.toLowerCase().includes('recreation')) tags.push('recreation');

          const event = {
            title,
            description,
            date: dateText,
            location,
            category,
            tags,
            link: link ? (link.startsWith('http') ? link : `https://calendar.unt.edu${link}`) : ''
          };

          // Parse the date before adding the event
          const parsedDate = this.parseDate(dateText);
          if (parsedDate) {
            event.parsed_date = parsedDate;
            console.log('Found valid event:', {
              title: event.title,
              date: event.date,
              parsed_date: event.parsed_date.toISOString()
            });
            pageEvents.push(event);
          } else {
            console.log('Skipping event with invalid date:', {
              title: event.title,
              date: event.date
            });
          }
        });

        console.log(`Found ${pageEvents.length} valid events on page ${page}`);
        allEvents = [...allEvents, ...pageEvents];
        
        // Add a small delay between pages to be nice to the server
        if (page < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`Found ${allEvents.length} total valid events across all pages`);

      // Store events in database
      for (const event of allEvents) {
        try {
          // Insert event using ISO string format for the date
          const eventResult = await pool.query(
            `INSERT INTO unt_events (title, description, event_date, location, category, link)
             VALUES ($1, $2, $3::timestamp with time zone, $4, $5, $6)
             ON CONFLICT (title, event_date) DO UPDATE
             SET description = EXCLUDED.description,
                 location = EXCLUDED.location,
                 category = EXCLUDED.category,
                 link = EXCLUDED.link
             RETURNING id`,
            [event.title, event.description, event.parsed_date.toISOString(), event.location, event.category, event.link]
          );

          const eventId = eventResult.rows[0].id;

          // Insert tags
          for (const tag of event.tags) {
            await pool.query(
              `INSERT INTO event_tags (event_id, tag_name)
               VALUES ($1, $2)
               ON CONFLICT (event_id, tag_name) DO NOTHING`,
              [eventId, tag]
            );
          }
        } catch (error) {
          console.error('Error storing event:', {
            title: event.title,
            date: event.date,
            parsed_date: event.parsed_date?.toISOString()
          }, error);
        }
      }

      return allEvents;
    } catch (error) {
      console.error('Error scraping UNT calendar:', error);
      throw error;
    }
  }

  // Schedule this to run periodically (e.g., every hour)
  static async startScraping() {
    try {
      await this.scrapeEvents();
      console.log('Successfully scraped UNT calendar events');
    } catch (error) {
      console.error('Failed to scrape UNT calendar:', error);
    }

    // Schedule next scrape in 1 hour
    setTimeout(() => this.startScraping(), 60 * 60 * 1000);
  }
}

export default UNTCalendarScraper; 