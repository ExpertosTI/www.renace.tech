<?php
$config = [];
$config['db_dsnw'] = 'sqlite:////var/www/html/temp/sqlite.db?mode=0646';
$config['default_host'] = 'stalwart-mail';
$config['default_port'] = 143;
$config['smtp_server'] = 'stalwart-mail';
$config['smtp_port'] = 587;
$config['smtp_user'] = '%u';
$config['smtp_pass'] = '%p';
$config['support_url'] = 'https://renace.tech/support';
$config['product_name'] = 'RENACE Tech Mail';
$config['skin'] = 'elastic';
$config['skin_logo'] = [
    'elastic' => 'skins/elastic/images/renace_logo.svg',
];
$config['favicon'] = 'favicon.ico';
$config['plugins'] = [
    'archive',
    'zipdownload',
];
$config['drafts_mbox'] = 'Drafts';
$config['junk_mbox'] = 'Junk';
$config['sent_mbox'] = 'Sent';
$config['trash_mbox'] = 'Trash';
$config['create_default_folders'] = true;
