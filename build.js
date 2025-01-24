const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const frontMatter = require('front-matter');

// Paths
const SOURCE_DIR = path.join(__dirname, 'src', 'markdown');
const BUILD_DIR = path.join(__dirname, 'public');
const BLOG_DIR = path.join(BUILD_DIR, 'blog');

// Ensure build directories exist
fs.ensureDirSync(BUILD_DIR);
fs.ensureDirSync(BLOG_DIR);

// Process Markdown files
async function buildSite() {
    console.log('🚀 Starting build process...');

    try {
        // Process blog posts
        const postsDir = path.join(SOURCE_DIR, 'blog');
        if (fs.existsSync(postsDir)) {
            const posts = fs.readdirSync(postsDir).filter(file => file.endsWith('.md'));
            
            console.log(`📝 Found ${posts.length} blog posts`);
            
            for (const post of posts) {
                const content = fs.readFileSync(path.join(postsDir, post), 'utf-8');
                const { attributes, body } = frontMatter(content);
                const htmlContent = marked.parse(body);
                
                // Create HTML file
                const htmlFilename = post.replace('.md', '.html');
                const postTemplate = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>${attributes.title || 'Blog Post'}</title>
                        <link rel="stylesheet" href="/css/style.css">
                    </head>
                    <body>
                        <header>
                            <nav>
                                <div class="logo">My Website</div>
                                <ul class="nav-links">
                                    <li><a href="/">Home</a></li>
                                    <li><a href="/blog" class="active">Blog</a></li>
                                    <li><a href="/about">About</a></li>
                                    <li><a href="/faq">FAQ</a></li>
                                </ul>
                            </nav>
                        </header>
                        <main class="blog-post">
                            <article>
                                <h1>${attributes.title || 'Untitled'}</h1>
                                ${attributes.date ? `<time>${new Date(attributes.date).toLocaleDateString()}</time>` : ''}
                                ${htmlContent}
                            </article>
                        </main>
                        <footer>
                            <p>&copy; 2024 My Website. All rights reserved.</p>
                        </footer>
                    </body>
                    </html>
                `;
                
                fs.writeFileSync(path.join(BLOG_DIR, htmlFilename), postTemplate.trim());
                console.log(`✅ Built ${htmlFilename}`);
            }
        }

        // Copy static assets
        await fs.copy(path.join(__dirname, 'public'), BUILD_DIR, {
            filter: (src) => !src.includes('node_modules')
        });

        console.log('🎉 Build completed successfully!');
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

buildSite(); 