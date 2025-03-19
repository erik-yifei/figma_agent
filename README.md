# Dub News Generator

Generate Instagram posts and stories from news articles.

## Features

- **URL Processing**: Paste a news article URL to auto-extract and process content
- **Manual Input**: Directly paste article text for processing
- **AI-Powered Content Generation**: Use OpenAI to generate headlines, body text, and captions

## Setup

1. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

2. Set up your OpenAI API key:
   - Create a `.env` file in the project directory
   - Add your API key: `OPENAI_API_KEY=your_api_key_here`
   - Alternatively, input your API key directly in the app interface

## Running the Application

### Main Application:
```
python app.py
```

### URL Processing Demo:
```
python url_processor.py
```

## Testing the Article Scraper:
```
python article_scraper.py
```

## Integration Options

You can use these components in the following ways:

1. **URL Processor** - Run the standalone URL processor to test the article scraping functionality
2. **Article Scraper** - Import the scraping functions into your own workflow
3. **Main Application** - Continue using the original app.py for your existing workflow

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (can be set as a Space secret) 