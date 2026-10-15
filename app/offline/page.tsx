export default function OfflinePage() {
  return (
    <html lang="en-AU">
      <head>
        <title>Offline · Booran Motors Sales Floor OS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            background: #171b22;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 2rem;
          }
          .container { max-width: 380px; }
          .icon-wrap {
            width: 96px; height: 96px;
            background: rgba(230, 0, 18, 0.12);
            border: 1px solid rgba(230, 0, 18, 0.25);
            border-radius: 24px;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 2rem;
            font-size: 3rem;
          }
          h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 0.75rem; letter-spacing: -0.02em; }
          p { color: #8892a4; font-size: 0.9rem; line-height: 1.6; margin-bottom: 2rem; }
          .badge {
            display: inline-block;
            background: rgba(230,0,18,0.1);
            border: 1px solid rgba(230,0,18,0.2);
            color: #e60012;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1.5rem;
          }
          .retry-btn {
            display: inline-flex; align-items: center; gap: 0.5rem;
            background: #e60012;
            color: #fff;
            font-size: 0.9rem; font-weight: 700;
            padding: 0.85rem 2rem;
            border-radius: 12px;
            border: none; cursor: pointer;
            text-decoration: none;
            transition: opacity 0.2s;
          }
          .retry-btn:hover { opacity: 0.85; }
          .divider { width: 40px; height: 2px; background: #e60012; margin: 0 auto 2rem; border-radius: 2px; }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="icon-wrap">📡</div>
          <div className="badge">No Connection</div>
          <div className="divider" />
          <h1>You&apos;re Offline</h1>
          <p>
            The Booran Motors Sales Floor OS requires a connection to load live data.
            Please check your network and try again.
          </p>
          <a href="/" className="retry-btn">
            ↺ Retry Connection
          </a>
        </div>
      </body>
    </html>
  );
}
