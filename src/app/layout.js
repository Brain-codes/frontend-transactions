import "./globals.css";

export const metadata = {
  title: "Stove Transaction Viewer",
  description:
    "An intuitive application for tracking and managing stove transactions efficiently.",
  keywords:
    "stove transactions, transaction management, financial tracking, stove sales",
  author: "Your Name",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={metadata.description} />
        <meta name="keywords" content={metadata.keywords} />
        <meta name="author" content={metadata.author} />
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://yourwebsite.com" />
        <meta property="og:image" content="https://yourwebsite.com/image.jpg" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
