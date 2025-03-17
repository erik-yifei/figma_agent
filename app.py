import gradio as gr
import os
import json
import openai
from dotenv import load_dotenv
import pyperclip

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variables or let user input it
api_key = os.getenv("OPENAI_API_KEY", "")

# The default system prompt
DEFAULT_PROMPT = """
Breaking Headline: Create a clear and engaging headline.
70-Word Narrative: Summarize the news article in a single, cohesive 70-word paragraph.
30-Word Instagram Caption: Write a 30-word caption for an Instagram post.

Guidelines:
- Include all important numbers and stats from the article using only the provided data.
- Do not hallucinate or use any outside statistics or hashtags.
- Use clear, simple language and grammar suitable for Instagram readers.
- Maintain an informational and engaging tone without being overly cringy.
- When using complex or policy-related terms, include brief explanations in parentheses.
- Since the input may contain entire website information, distinguish between the actual
  news text and distracting ads or irrelevant information, and focus solely on the relevant news content.

Return a JSON response with exactly this structure:
{
  "isBreaking": boolean,
  "headline": string,
  "body": string,
  "instagramCaption": string
}
"""

def format_for_figma(headline, body, instagram_caption, is_breaking):
    """Format the content in a structured format for the Figma plugin to parse"""
    # Create a special format that can be easily parsed
    formatted_content = f"DUB_NEWS_DATA_START\n"
    formatted_content += f"TEMPLATE_TYPE: {'breaking' if is_breaking else 'non-breaking'}\n"
    formatted_content += f"HEADLINE: {headline}\n"
    formatted_content += f"BODY: {body}\n"
    formatted_content += f"INSTAGRAM: {instagram_caption}\n"
    formatted_content += f"DUB_NEWS_DATA_END"
    
    return formatted_content

def process_article(api_key, article_text, is_breaking, custom_instructions=""):
    """Process a news article and generate content using OpenAI's API"""
    if not api_key:
        return "Please provide an OpenAI API key", "", "", ""
    
    if not article_text:
        return "Please provide a news article", "", "", ""
    
    try:
        openai.api_key = api_key
        
        # Create system prompt with custom instructions if provided
        system_prompt = DEFAULT_PROMPT
        if custom_instructions:
            system_prompt += f"\n\nAdditional specific instructions for this article:\n{custom_instructions}"
        
        # Add breaking news instruction based on checkbox
        breaking_instruction = f"\nThis is {'breaking' if is_breaking else 'non-breaking'} news."
        system_prompt += breaking_instruction
        
        # Make API call
        response = openai.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": article_text}
            ]
        )
        
        # Process the response
        content = json.loads(response.choices[0].message.content)
        
        # Override isBreaking based on user selection
        content["isBreaking"] = is_breaking
        
        # Create figma-ready format
        figma_format = format_for_figma(
            content["headline"],
            content["body"],
            content["instagramCaption"],
            is_breaking
        )
        
        return (
            content["headline"], 
            content["body"], 
            content["instagramCaption"],
            figma_format
        )
        
    except Exception as e:
        return f"Error: {str(e)}", "", "", ""

# Create the Gradio interface
with gr.Blocks(title="Dub News Generator") as demo:
    gr.Markdown("# Dub News Generator")
    gr.Markdown("Generate news content for your Figma plugin using GPT-4o")
    
    with gr.Row():
        with gr.Column():
            api_key_input = gr.Textbox(
                label="OpenAI API Key", 
                placeholder="Enter your OpenAI API key", 
                type="password",
                value=api_key
            )
            
            with gr.Row():
                save_key_btn = gr.Button("Save Key for Session", variant="secondary")
                clear_key_btn = gr.Button("Clear Key", variant="secondary")
            
            api_key_status = gr.Markdown("")
            
            article_input = gr.Textbox(
                label="News Article", 
                placeholder="Paste the news article text here...",
                lines=10
            )
            
            is_breaking = gr.Checkbox(label="Is this Breaking News?")
            
            with gr.Accordion("Custom Instructions (Optional)", open=False):
                custom_instructions = gr.Textbox(
                    label="Additional Instructions",
                    placeholder="Add any specific instructions for processing this article...",
                    lines=3
                )
            
            generate_btn = gr.Button("Generate Content", variant="primary")
            
        with gr.Column():
            headline_output = gr.Textbox(label="Headline")
            body_output = gr.Textbox(label="Body Text", lines=5)
            instagram_output = gr.Textbox(label="Instagram Caption", lines=3)
            
            with gr.Accordion("Figma-Ready Format", open=True):
                figma_output = gr.Textbox(label="Copy this to Figma", lines=10)
                figma_copy_btn = gr.Button("Copy to Clipboard for Figma")
                figma_copy_status = gr.Markdown("")
    
    # Event handlers
    def save_api_key(key):
        return "✅ API key saved for this session"
    
    def clear_api_key():
        return "", "API key cleared"
    
    # Connect events
    generate_btn.click(
        process_article, 
        inputs=[api_key_input, article_input, is_breaking, custom_instructions],
        outputs=[headline_output, body_output, instagram_output, figma_output]
    )
    
    save_key_btn.click(
        save_api_key,
        inputs=[api_key_input],
        outputs=[api_key_status]
    )
    
    clear_key_btn.click(
        clear_api_key,
        outputs=[api_key_input, api_key_status]
    )
    
    # Copy button functionality (uses JavaScript)
    figma_copy_btn.click(
        copy_to_clipboard,
        inputs=[figma_output],
        outputs=[figma_copy_status]
    )

# Launch the app
if __name__ == "__main__":
    demo.launch()

def copy_to_clipboard(figma_format):
    if not figma_format:
        return "⚠️ No content to copy"
    
    try:
        pyperclip.copy(figma_format)
        return "✅ Copied to clipboard - Now paste in the Figma plugin's 'Paste from App' tab"
    except Exception as e:
        return f"❌ Error copying to clipboard: {str(e)}" 