<?php
// Edit driver/dashboard.html, then run npm run build.
// Fixed filename: no request input is used for file access.
header('Content-Type: text/html; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
readfile(__DIR__ . '/dashboard.html');
