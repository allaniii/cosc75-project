<?php
// Optional source-tree entry point. Serve dist/ as your document root after building.
// The built PHP page serves a fixed HTML file; Supabase handles authentication.
header('Location: dist/login.php', true, 307);
exit;
