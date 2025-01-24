# Simple Static Website

A lightweight website built with HTML, CSS, and vanilla JavaScript, featuring a blog system with Markdown support.

## Project Structure

## Features
- Landing page
- Blog with Markdown support
- About page
- FAQ page
- Contact form

## Setup
1. Install Node.js if you haven't already
2. Run `npm init -y` to create a package.json
3. Install dependencies:
   ```bash
   npm install marked fs-extra
   ```

## Development
1. Write Markdown files in `src/markdown/`
2. Run the build script to convert Markdown to HTML
3. Serve the `public` directory using a local server

## Plan
1. Make a simple landing page
2. Make a template for a blog post
3. Make a Markdown -> HTML converter
4. Integrate for ConvertKit
5. Add a contact form