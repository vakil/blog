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
                    <li><a href="/">Home</a></li>
                    <li><a href="/blog">Blog</a></li>
                    <li><a href="/about">About</a></li>
                    <li><a href="/faq">FAQ</a></li>
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
                ${CONFIG.templates.navigation}
            </header>
            ${content}
            <footer>
                <p>&copy; 2024 My Website. All rights reserved.</p>
            </footer>
            ${options.scripts || ''}
        </body>
        </html>
    `;
}

function createHomeTemplate(attributes, content, blogPosts) {
    const mainContent = `
        <main>
            <section class="hero">
                ${content}
            </section>
            <section class="featured">
                <h2>Latest Blog Posts</h2>
                <div class="posts-grid">
                    ${blogPosts ? renderBlogPreviews(blogPosts) : '<p>Coming soon...</p>'}
                </div>
            </section>
        </main>
    `;
    return createBaseTemplate(attributes, mainContent, { scripts: '<script src="js/main.js"></script>' });
}

function createPageTemplate(attributes, content, blogPosts = null) {
    const mainContent = `
        <main class="page-content">
            <article>
                <h1>${attributes.title || 'Untitled'}</h1>
                ${attributes.date ? `<time>${new Date(attributes.date).toLocaleDateString()}</time>` : ''}
                ${content}
                ${blogPosts ? `<div class="blog-list">${renderBlogPreviews(blogPosts)}</div>` : ''}
            </article>
        </main>
    `;
    return createBaseTemplate(attributes, mainContent);
}

// Helper functions
function renderBlogPreviews(posts) {
    return posts.map(post => `
        <div class="blog-post-preview">
            <h2><a href="/blog/${post.slug}">${post.title}</a></h2>
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
            
            const postTemplate = createPageTemplate(attributes, content);
            await fs.writeFile(path.join(postDir, 'index.html'), postTemplate.trim());
            console.log(`✅ Built ${postName}/index.html`);
        }
    }
    return blogPosts;
}

async function buildPages(blogPosts) {
    const pagesDir = path.join(CONFIG.paths.source, 'pages');
    if (!fs.existsSync(pagesDir)) return;

    const pages = fs.readdirSync(pagesDir).filter(file => file.endsWith('.md'));
    console.log(`📄 Found ${pages.length} pages`);

    for (const page of pages) {
        const { attributes, content } = await processMarkdownFile(path.join(pagesDir, page));
        const pageName = page.replace('.md', '');
        
        let template;
        if (attributes.template === 'home') {
            template = createHomeTemplate(attributes, content, blogPosts);
        } else {
            template = createPageTemplate(attributes, content, pageName === 'blog' ? blogPosts : null);
        }

        const outputPath = pageName === 'index' 
            ? path.join(CONFIG.paths.build, 'index.html')
            : path.join(CONFIG.paths.build, pageName, 'index.html');

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