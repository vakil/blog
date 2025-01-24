const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const frontMatter = require('front-matter');

// Paths
const SOURCE_DIR = path.join(__dirname, 'src', 'markdown');
const BUILD_DIR = path.join(__dirname, 'public');
const BLOG_DIR = path.join(BUILD_DIR, 'blog');
const PAGES_DIR = path.join(BUILD_DIR);

// Ensure build directories exist
fs.ensureDirSync(BUILD_DIR);
fs.ensureDirSync(BLOG_DIR);

// Template function
function createHtmlTemplate(attributes, content, isPage = false, blogPosts = null) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${attributes.title || 'My Website'}</title>
            <link rel="stylesheet" href="/css/style.css">
        </head>
        <body>
            <header>
                <nav>
                    <div class="logo">My Website</div>
                    <ul class="nav-links">
                        <li><a href="/">Home</a></li>
                        <li><a href="/blog">Blog</a></li>
                        <li><a href="/about">About</a></li>
                        <li><a href="/faq">FAQ</a></li>
                    </ul>
                </nav>
            </header>
            <main class="${isPage ? 'page-content' : 'blog-post'}">
                <article>
                    <h1>${attributes.title || 'Untitled'}</h1>
                    ${attributes.date ? `<time>${new Date(attributes.date).toLocaleDateString()}</time>` : ''}
                    ${content}
                    ${blogPosts ? `
                    <div class="blog-list">
                        ${blogPosts.map(post => `
                            <div class="blog-post-preview">
                                <h2><a href="/blog/${post.slug}">${post.title}</a></h2>
                                ${post.date ? `<time>${new Date(post.date).toLocaleDateString()}</time>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </article>
            </main>
            <footer>
                <p>&copy; 2024 My Website. All rights reserved.</p>
            </footer>
        </body>
        </html>
    `;
}

// Process Markdown files
async function buildSite() {
    console.log('🚀 Starting build process...');

    try {
        // Create temporary directory for static assets
        const tempDir = path.join(__dirname, 'temp_static');
        await fs.ensureDir(tempDir);
        
        // Copy static assets to temp directory first
        if (fs.existsSync(path.join(__dirname, 'public'))) {
            await fs.copy(path.join(__dirname, 'public'), tempDir, {
                filter: (src) => !src.includes('node_modules') && !src.endsWith('.html')
            });
        }

        // Collect blog posts data
        const blogPosts = [];
        const postsDir = path.join(SOURCE_DIR, 'blog');
        if (fs.existsSync(postsDir)) {
            const posts = fs.readdirSync(postsDir).filter(file => file.endsWith('.md'));
            
            console.log(`📝 Found ${posts.length} blog posts`);
            
            for (const post of posts) {
                const content = fs.readFileSync(path.join(postsDir, post), 'utf-8');
                const { attributes, body } = frontMatter(content);
                const htmlContent = marked.parse(body);
                
                // Store post data for the index
                blogPosts.push({
                    title: attributes.title || 'Untitled',
                    date: attributes.date,
                    slug: post.replace('.md', '')
                });
                
                // Create directory for the post
                const postName = post.replace('.md', '');
                const postDir = path.join(BLOG_DIR, postName);
                await fs.ensureDir(postDir);
                
                // Create HTML file as index.html in the post directory
                const postTemplate = createHtmlTemplate(attributes, htmlContent);
                fs.writeFileSync(path.join(postDir, 'index.html'), postTemplate.trim());
                console.log(`✅ Built ${postName}/index.html`);
            }
        }

        // Create blog index page
        const blogIndexContent = fs.readFileSync(path.join(SOURCE_DIR, 'pages', 'blog.md'), 'utf-8');
        const { attributes, body } = frontMatter(blogIndexContent);
        const htmlContent = marked.parse(body);
        const blogIndexTemplate = createHtmlTemplate(attributes, htmlContent, true, blogPosts);
        fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), blogIndexTemplate.trim());
        console.log('✅ Built blog/index.html');

        // Process other pages
        const pagesDir = path.join(SOURCE_DIR, 'pages');
        if (fs.existsSync(pagesDir)) {
            const pages = fs.readdirSync(pagesDir)
                .filter(file => file.endsWith('.md') && file !== 'blog.md');
            
            console.log(`📄 Found ${pages.length} pages`);
            
            for (const page of pages) {
                const content = fs.readFileSync(path.join(pagesDir, page), 'utf-8');
                const { attributes, body } = frontMatter(content);
                const htmlContent = marked.parse(body);
                
                // Create directory for the page
                const pageName = page.replace('.md', '');
                const pageDir = path.join(BUILD_DIR, pageName);
                await fs.ensureDir(pageDir);
                
                const pageTemplate = createHtmlTemplate(attributes, htmlContent, true);
                fs.writeFileSync(path.join(pageDir, 'index.html'), pageTemplate.trim());
                console.log(`✅ Built ${pageName}/index.html`);
            }
        }

        // Copy temp static assets back to build directory
        await fs.copy(tempDir, BUILD_DIR);
        
        // Clean up temp directory
        await fs.remove(tempDir);

        console.log('🎉 Build completed successfully!');
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

buildSite(); 