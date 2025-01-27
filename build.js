const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const frontMatter = require('front-matter');

// Configuration
const CONFIG = {
    paths: {
        source: path.join(__dirname, 'src', 'markdown'),
        build: path.join(__dirname, 'public'),
        blog: path.join(__dirname, 'public', 'blog'),
        pages: path.join(__dirname, 'public')
    },
    templates: {
        navigation: `
            <nav>
                <div class="logo">My Website</div>
                <ul class="nav-links">
                    <li><a href="/" data-path="">Home</a></li>
                    <li><a href="/blog" data-path="/blog">Blog</a></li>
                    <li><a href="/about" data-path="/about">About</a></li>
                    <li><a href="/faq" data-path="/faq">FAQ</a></li>
                </ul>
            </nav>
        `
    }
};

// Ensure build directories exist
function createDirectories() {
    Object.values(CONFIG.paths).forEach(dir => fs.ensureDirSync(dir));
}

// Template generators
function createBaseTemplate(attributes, content, options = {}) {
    const cssPath = options.depth === 2 ? '../../css/style.css' : '../css/style.css';
    
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${attributes.title || 'My Website'}</title>
            <link rel="stylesheet" href="${cssPath}">
            <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
            <style>
                /* Add any page-specific styles here */
            </style>
        </head>
        <body>
            <header>
                <div class="container">
                    ${CONFIG.templates.navigation}
                </div>
            </header>
            ${content}
            <footer>
                <div class="container">
                    <p>&copy; 2024 My Website. All rights reserved.</p>
                </div>
            </footer>
            <script>
                // Determine if we're on GitHub Pages
                const isGitHubPages = window.location.hostname.includes('github.io');
                const basePath = isGitHubPages ? '/blog' : '';

                // Update navigation links
                document.querySelectorAll('[data-path]').forEach(link => {
                    link.href = \`\${basePath}\${link.dataset.path}\`;
                });
            </script>
            ${options.scripts || ''}
        </body>
        </html>
    `;
}

function createHomeTemplate(attributes, content, blogPosts) {
    const mainContent = `
        <main>
            <section class="hero">
                <div class="container">
                    <h1>Welcome to my<br><span class="highlight">home on the web</span></h1>
                    <p>I'm a entrepreneur, comic artist & programmer. I'm passionate about the intersection of technology, spirituality, and art.</p>
                    <a href="" class="cta-button" data-path="/blog">Read the Blog</a>
                </div>
            </section>
            <section class="featured">
                <div class="container">
                    <h2>Latest Blog Posts</h2>
                    <div class="posts-grid">
                        ${blogPosts ? renderBlogPreviews(blogPosts) : '<p>Coming soon...</p>'}
                    </div>
                </div>
            </section>
        </main>
    `;
    
    const scripts = `
        <script>
            // Determine if we're on GitHub Pages
            const isGitHubPages = window.location.hostname.includes('github.io');
            const basePath = isGitHubPages ? '/blog' : '';

            async function fetchLatestPosts() {
                try {
                    const response = await fetch(\`\${basePath}/blog/posts.json\`);
                    const posts = await response.json();
                    
                    const postsGrid = document.querySelector('.posts-grid');
                    postsGrid.innerHTML = posts.slice(0, 3).map(post => \`
                        <div class="blog-post-preview">
                            <h2><a href="\${basePath}/blog/\${post.slug}">\${post.title}</a></h2>
                            \${post.date ? \`<time>\${new Date(post.date).toLocaleDateString()}</time>\` : ''}
                        </div>
                    \`).join('');
                } catch (error) {
                    console.error('Error fetching blog posts:', error);
                    const postsGrid = document.querySelector('.posts-grid');
                    postsGrid.innerHTML = '<p>Coming soon...</p>';
                }
            }
            fetchLatestPosts();
        </script>
    `;
    
    return createBaseTemplate(attributes, mainContent, { scripts });
}

function createPageTemplate(attributes, content, blogPosts = null, options = {}) {
    const mainContent = `
        <main class="page-content">
            <article>
                <h1>${attributes.title || 'Untitled'}</h1>
                ${attributes.date ? `<time>${new Date(attributes.date).toLocaleDateString()}</time>` : ''}
                ${content}
                ${blogPosts ? `<div class="blog-list">${renderBlogPreviews(blogPosts, options.depth)}</div>` : ''}
            </article>
        </main>
    `;
    return createBaseTemplate(attributes, mainContent, options);
}

// Helper functions
function renderBlogPreviews(posts, depth = 1) {
    const prefix = depth === 2 ? '../' : '';
    return posts.map(post => `
        <div class="blog-post-preview">
            <h2><a href="${prefix}${post.slug}">${post.title}</a></h2>
            ${post.date ? `<time>${new Date(post.date).toLocaleDateString()}</time>` : ''}
        </div>
    `).join('');
}

async function processMarkdownFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const { attributes, body } = frontMatter(content);
    return {
        attributes,
        content: marked.parse(body)
    };
}

// Build functions
async function buildBlogPosts() {
    const postsDir = path.join(CONFIG.paths.source, 'blog');
    const blogPosts = [];

    if (fs.existsSync(postsDir)) {
        const posts = fs.readdirSync(postsDir).filter(file => file.endsWith('.md'));
        console.log(`📝 Found ${posts.length} blog posts`);

        for (const post of posts) {
            const { attributes, content } = await processMarkdownFile(path.join(postsDir, post));
            const postName = post.replace('.md', '');
            
            blogPosts.push({
                title: attributes.title || 'Untitled',
                date: attributes.date,
                slug: postName
            });

            const postDir = path.join(CONFIG.paths.blog, postName);
            await fs.ensureDir(postDir);
            
            const postTemplate = createPageTemplate(attributes, content, null, { depth: 2 });
            await fs.writeFile(path.join(postDir, 'index.html'), postTemplate.trim());
            console.log(`✅ Built ${postName}/index.html`);
        }

        // Generate posts.json for the homepage
        await fs.writeFile(
            path.join(CONFIG.paths.blog, 'posts.json'),
            JSON.stringify(blogPosts.sort((a, b) => new Date(b.date) - new Date(a.date)))
        );
        console.log('✅ Generated posts.json');
    }
    return blogPosts;
}

async function buildPages(blogPosts) {
    const pagesDir = path.join(CONFIG.paths.source, 'pages');
    if (!fs.existsSync(pagesDir)) return;

    const pages = fs.readdirSync(pagesDir)
        .filter(file => file.endsWith('.md') && file !== 'index.md');
    console.log(`📄 Found ${pages.length} pages`);

    for (const page of pages) {
        const { attributes, content } = await processMarkdownFile(path.join(pagesDir, page));
        const pageName = page.replace('.md', '');
        
        const template = createPageTemplate(
            attributes, 
            content, 
            pageName === 'blog' ? blogPosts : null,
            { depth: 1 }
        );
        const outputPath = path.join(CONFIG.paths.build, pageName, 'index.html');

        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, template.trim());
        console.log(`✅ Built ${pageName}/index.html`);
    }
}

// Main build process
async function buildSite() {
    console.log('🚀 Starting build process...');
    try {
        createDirectories();
        const blogPosts = await buildBlogPosts();
        await buildPages(blogPosts);
        console.log('🎉 Build completed successfully!');
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

buildSite(); 