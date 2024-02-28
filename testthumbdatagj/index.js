 // Imports
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const sharp = require('sharp');
const getExif = require('exif-async');
const parseDMS = require('parse-dms');

// Cloud Function triggered when a new object is created in the 'uploads' bucket
exports.gcf_generate_thumbnails = async (file, context) => {


// Entry point function
  const gcsFile = file;
  const storage = new Storage();
  const sourceBucket = storage.bucket(gcsFile.bucket);
  const thumbnailsBucket = storage.bucket('sp24-41200-malejci-gj-thumbnails');
  const finalBucket = storage.bucket('sp24-41200-malejci-gj-final');

  // HINT HINT HINT
  const version = process.env.K_REVISION;
  console.log(`Running Cloud Function version ${version}`);

  console.log(`File name: ${gcsFile.name}`);
  console.log(`Generation number: ${gcsFile.generation}`);
  console.log(`Content type: ${gcsFile.contentType}`);

  // Reject images that are not jpeg or png files
  let fileExtension = '';
  let validFile = false;

  if (gcsFile.contentType === 'image/jpeg') {
    console.log('This is a JPG file.');
    fileExtension = 'jpg';
    validFile = true;
  } else if (gcsFile.contentType === 'image/png') {
    console.log('This is a PNG file.');
    fileExtension = 'png';
    validFile = true;
  } else {
    console.log('This is not a valid file.');
  }

  // If the file is a valid photograph, download it to the 'local' VM so that we can create a thumbnail image
  if (validFile) {
    // Create a new filename for the 'final' version of the image file
    // The value of this will be something like '12745649237578595.jpg'
    const finalFileName = `${gcsFile.generation}.${fileExtension}`;

    // Create a working directory on the VM that runs our GCF to download the original file
    // The value of this variable will be something like 'tmp/thumbs'
    const workingDir = path.join(os.tmpdir(), 'thumbs');

    // Create a variable that holds the path to the 'local' version of the file
    // The value of this will be something like 'tmp/thumbs/398575858493.png'
    const tempFilePath = path.join(workingDir, finalFileName);

    // Wait until the working directory is ready
    await fs.ensureDir(workingDir);

    // Download the original file to the path on the 'local' VM
    await sourceBucket.file(gcsFile.name).download({
      destination: tempFilePath
    });
    // Entry Point Function
async function extractExif() {
  let gpsObject = await readExifData('china1.jpeg');
  console.log(gpsObject);
  let gpsDecimal = getGPSCoordinates(gpsObject);
  console.log(gpsDecimal);
  console.log(gpsDecimal.lat);
  console.log(gpsDecimal.lon);
}
const {Firestore} = require('@google-cloud/firestore')

//Entry point function
async function writeToFS() {
    const firestore = new Firestore({
        projectId: "sp24-41200-malejci-globaljags"
    });

    let dataObject = {};

    dataObject = {};

    dataObject.thumbURL = `https://storage/thumb@64_${finalFileName}`;
    dataObject.imageURL = `https://storage/${finalFileName}`;
    dataObject.latitude = 134.432
    dataObject.longitude = 234.434


    console.log("The dataobject: ");
    console.log(dataObject);

    let collectionRef = firestore.collection('photos');
    let documentRef = await collectionRef.add(dataObject);
    console.log(`Document created: ${documentRef.id}`)
}

//Call the entry point function
writeToFS();

// Call the Entry Point (not needed in GCF)
extractExif();
    // Upload our local version of the file to the final images bucket
    await finalBucket.upload(tempFilePath);

    // Create a name for the thumbnail image
    // The value for this will be something like `thumb@64_1234567891234567.jpg`
    const thumbName = `thumb@64_${finalFileName}`;

    // Create a path where we will store the thumbnail image locally
    // This will be something like `tmp/thumbs/thumb@64_1234567891234567.jpg`
    const thumbPath = path.join(workingDir, thumbName);

    // Use the sharp library to generate the thumbnail image and save it to the thumbPath
    // Then upload the thumbnail to the thumbnailsBucket in cloud storage
    await sharp(tempFilePath).resize(64).withMetadata().toFile(thumbPath).then(async () => {
      await thumbnailsBucket.upload(thumbPath);
    })

    // Delete the temp working directory and its files from the GCF's VM
    await fs.remove(workingDir);

  } // end of validFile==true

  // DELETE the original file uploaded to the "Uploads" bucket
  await sourceBucket.file(gcsFile.name).delete();
  console.log(`Deleted uploaded file: ${gcsFile.name}`);
}

// Helper Functions
async function readExifData(localFile) {
  let exifData;
  try {
      exifData = await getExif(localFile);
      // console.log(exifData);
      // console.log(exifData.gps);
      // console.log(exifData.gps.GPSLatitude);
      return exifData.gps;
  } catch(err) {
      console.log(err);
      return null;
  }
}

function getGPSCoordinates(g) {
  // PARSE DMS needs a string in the format of:
  // 51:30:0.5486N 0:7:34.4503W
  // DEG:MIN:SECDIRECTION DEG:MIN:SECDIRECTION
  const latString = `${g.GPSLatitude[0]}:${g.GPSLatitude[1]}:${g.GPSLatitude[2]}${g.GPSLatitudeRef}`;
  const lonString = `${g.GPSLongitude[0]}:${g.GPSLongitude[1]}:${g.GPSLongitude[2]}${g.GPSLongitudeRef}`;

  const degCoords = parseDMS(`${latString} ${lonString}`);

  return degCoords;
}

//Call the entry point function (not needed in GCF)
//writeToFS();