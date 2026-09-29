<?php
// Optional source-tree entry point. Serve dist/ as your document root after building.
// The built PHP page serves a fixed HTML file; Supabase handles authentication.
header('Location: ../dist/driver/maintenance.php', true, 307);
exit;
