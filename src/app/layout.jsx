import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import ErrorBoundary from "./components/ErrorBoundary";
import NextTopLoader from "nextjs-toploader";

export const metadata = {
  title: "Atmosfair Sales Management System",
  description:
    "An intuitive sales management application for tracking and managing Atmosfair sales transactions efficiently.",
  keywords:
    "atmosfair, sales management, transaction management, financial tracking, sales analytics",
  author: "Atmosfair",
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
      <body className="antialiased">
        <NextTopLoader color="#b6de04" spin={true} />
        <ErrorBoundary>
          <AuthProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
