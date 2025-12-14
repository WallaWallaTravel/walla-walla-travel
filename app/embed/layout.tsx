/**
 * Embed Layout
 * 
 * Special layout for embeddable widgets. Removes unnecessary UI chrome
 * and optimizes for iframe embedding.
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Allow embedding in iframes */}
        <meta httpEquiv="X-Frame-Options" content="ALLOWALL" />
        <style>{`
          /* Reset for iframe embedding */
          html, body {
            margin: 0;
            padding: 0;
            min-height: auto;
            background: white;
          }
          /* Hide scrollbar but allow scrolling */
          ::-webkit-scrollbar {
            width: 6px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background: #ddd;
            border-radius: 3px;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}




