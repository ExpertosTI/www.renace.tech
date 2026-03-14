<?php
// Security: Prevent open redirect vulnerability by hardcoding the destination.
// This ensures we only redirect to our trusted trusted executable.
header("Location: /docs/rustdesk-1.4.5-x86_64.exe", true, 301);
exit;
?>