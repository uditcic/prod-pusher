<?php
$targetDir = "uploads/";
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0777, true);
}

$targetFile = $targetDir . basename($_FILES["fileToUpload"]["name"]);
$uploadOk = 1;
$fileType = strtolower(pathinfo($targetFile, PATHINFO_EXTENSION));

// Optional: restrict file types
$allowed = ['txt', 'html', 'csv', 'xml', 'json'];

if (!in_array($fileType, $allowed)) {
    echo "Sorry, only " . implode(", ", $allowed) . " files are allowed.";
    $uploadOk = 0;
}

if ($uploadOk && move_uploaded_file($_FILES["fileToUpload"]["tmp_name"], $targetFile)) {
    echo "The file " . htmlspecialchars(basename($_FILES["fileToUpload"]["name"])) . " has been uploaded.";
} else {
    echo "Sorry, there was an error uploading your file.";
}
?>

