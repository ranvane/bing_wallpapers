export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (request.method === "POST" && pathname === "/import") {
      return await handleImport(request, env);
    } else if (pathname === "/") {
      return await renderHome(env);
    } else if (/^\/\d{4}-\d{2}$/.test(pathname)) {
      const month = pathname.slice(1);
…    img { max-width: 100%; height: auto; margin-top: 5px; margin-bottom: 5px; }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}
