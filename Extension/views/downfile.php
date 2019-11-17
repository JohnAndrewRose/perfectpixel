$contents = array_key_exists( 'data', $_POST ) ? $_POST['data'] : '';
if ( get_magic_quotes_gpc() ) {
  $contents = stripslashes( $contents );
}
$filename = 'somefile.txt';

header("Pragma: public"); // required
header("Expires: 0");
header("Cache-Control: must-revalidate, post-check=0, pre-check=0");
header("Cache-Control: private",false); // required for certain browsers
header("Content-Type: application/octet-stream"); // may also try 'application/force-download'
header("Content-Disposition: attachment; filename=\"".$filename."\";" );
header("Content-Length: ".strlen($contents));
echo $contents;
exit;