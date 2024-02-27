const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const sharp = require('sharp');
const exif = require('exif-async');
const parseDMS = require('parse-dms');

// Cloud Function triggered when a new object is created in the 'uploads' bucket
exports.gcf_generate_thumbnails = async (file, context) => {
  const storage = new Storage();
  const sourceBucket = storage.bucket(file.bucket);
  const thumbnailsBucket = storage.bucket('thumbnails');
  const finalBucket = storage.bucket('final');

  const tempDir = path.join(os.tmpdir(), 'uploads');
  const tempFilePath = path.join(tempDir, file.name);

  // Version 1: Basic functionality - download and delete
  console.log(`File name: ${file.name}`);
  await fs.ensureDir(tempDir);
  await sourceBucket.file(file.name).download({ destination: tempFilePath });
  await fs.remove(tempDir);
  console.log(`Deleted temporary directory: ${tempDir}`);

  // Version 2: Validate file type, copy to final bucket, and delete
  if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
    const finalFilePath = path.join('final', file.name);
    await fs.ensureDir(tempDir);
    await sourceBucket.file(file.name).download({ destination: tempFilePath });
    await finalBucket.upload(tempFilePath, { destination: finalFilePath });

    const thumbName = `thumb@64_${file.name}`;
    const thumbPath = path.join(tempDir, thumbName);

    await sharp(tempFilePath).resize(64).withMetadata().toFile(thumbPath);
    await thumbnailsBucket.upload(thumbPath, { destination: thumbName });

    console.log(`Download file to: ${tempFilePath}`);
    await fs.remove(tempDir);
    console.log(`Deleted temporary directory: ${tempDir}`);

    // Version 3: Read EXIF data
    const exifData = await readExifData(tempFilePath);
    if (exifData) {
      const { latitude, longitude } = getGPSCoordinates(exifData);
      console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
    }

    // DELETE the original file uploaded to the "Uploads" bucket
    await sourceBucket.file(file.name).delete();
    console.log(`Deleted uploaded file: ${file.name}`);
  } else {
    console.log('Invalid content type. Deleting file.');
    await sourceBucket.file(file.name).delete();
    console.log(`Deleted uploaded file: ${file.name}`);
  }
};

// Helper function to get EXIF data from the image file
async function readExifData(localFile) {
  try {
    const exifData = await exif.parse(localFile);
    return exifData.gps;
  } catch (err) {
    console.log(err);
    return null;
  }
}

// Helper function to parse EXIF coordinates into decimal numbers
function getGPSCoordinates(g) {
  const latString = `${g.GPSLatitude[0]}:${g.GPSLatitude[1]}:${g.GPSLatitude[2]}${g.GPSLatitudeRef}`;
  const lonString = `${g.GPSLongitude[0]}:${g.GPSLongitude[1]}:${g.GPSLongitude[2]}${g.GPSLongitudeRef}`;
  const degCoords = parseDMS(`${latString} ${lonString}`);
  return degCoords;
}

//v4
const {Firestore} = require('@google-cloud/firestore');


//Entry point function
async function writeToFS() {
    const firestore = new Firestore({
        projectId: "sp24-41200-malejci-globaljags"
        //databaseId: "whatever"
});

//Create a dummy object for demo purposes
    dataObject = {};

    //Add some key:value pairs
    dataObject.firstName = "Jessica";
    dataObject.lastName = "Malejcikova";
    dataObject.ThumbURL = "https://storage/thumb@64_blah.jpg"
    dataObject.imageURL = "https://storage/blah.jpg"
    dataObject.latitude = 134.432
    dataObject.longitude = 234.434

    console.log(`The dataobject: `);
    console.log(dataObject);

    //Write the object into Firestore
    let collectionRef = firestore.collection('photos');
    let documentRef = await collectionRef.add(dataObject);
    console.log(`Document created: ${documentRef.id}`);

}
//Call the entry point function (not needed in GCF)
writeToFS();