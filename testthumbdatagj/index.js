// Imports
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const sharp = require('sharp');
const getExif = require('exif-async');
const parseDMS = require('parse-dms');
const { Firestore } = require('@google-cloud/firestore');

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
        const finalFileName = `${gcsFile.generation}.${fileExtension}`;

        // Create a working directory on the VM that runs our GCF to download the original file
        const workingDir = path.join(os.tmpdir(), 'thumbs');

        // Create a variable that holds the path to the 'local' version of the file
        const tempFilePath = path.join(workingDir, finalFileName);

        // Wait until the working directory is ready
        await fs.ensureDir(workingDir);

        // Download the original file to the path on the 'local' VM
        await sourceBucket.file(gcsFile.name).download({
            destination: tempFilePath
        });

        // Entry Point Function to extract EXIF data
        async function extractExif() {
            let gpsObject = await readExifData(tempFilePath);
            console.log(gpsObject);
            if (gpsObject) {
                let gpsDecimal = getGPSCoordinates(gpsObject);
                console.log(gpsDecimal);
                console.log(gpsDecimal.lat);
                console.log(gpsDecimal.lon);

                // Write data to Firestore
                const firestore = new Firestore({
                    projectId: "sp24-41200-malejci-globaljags"
                });

                const photoData = {
                    thumbnailURL: `https://storage.googleapis.com/${thumbnailsBucket.name}/${finalFileName}`,
                    imageURL: `https://storage.googleapis.com/${finalBucket.name}/${finalFileName}`,
                    latitude: gpsDecimal.lat,
                    longitude: gpsDecimal.lon
                };

                await firestore.collection('photos').add(photoData);
            } else {
                console.log('No GPS data found in the image.');
            }
        }

        // Call the Entry Point Function to extract EXIF data
        await extractExif();

        // Upload our local version of the file to the final images bucket
        await finalBucket.upload(tempFilePath);

        // Create a name for the thumbnail image
        const thumbName = `thumb@64_${finalFileName}`;

        // Create a path where we will store the thumbnail image locally
        const thumbPath = path.join(workingDir, thumbName);

        // Use the sharp library to generate the thumbnail image and save it to the thumbPath
        await sharp(tempFilePath).resize(64).withMetadata().toFile(thumbPath);

        // Upload the thumbnail to the thumbnailsBucket in cloud storage
        await thumbnailsBucket.upload(thumbPath);

        // Delete the temp working directory and its files from the GCF's VM
        await fs.remove(workingDir);
    }

    // DELETE the original file uploaded to the "Uploads" bucket
    await sourceBucket.file(gcsFile.name).delete();
    console.log(`Deleted uploaded file: ${gcsFile.name}`);
};

// Helper Functions
async function readExifData(localFile) {
    let exifData;
    try {
        exifData = await getExif(localFile);
        return exifData.gps;
    } catch (err) {
        console.log(err);
        return null;
    }
}

function getGPSCoordinates(g) {
    if (g) {
        const latString = `${g.GPSLatitude[0]}:${g.GPSLatitude[1]}:${g.GPSLatitude[2]}${g.GPSLatitudeRef}`;
        const lonString = `${g.GPSLongitude[0]}:${g.GPSLongitude[1]}:${g.GPSLongitude[2]}${g.GPSLongitudeRef}`;
        const degCoords = parseDMS(`${latString} ${lonString}`);
        return degCoords;
    } else {
        console.log('GPS coordinates not found in EXIF Image data.');
        return null;
    }
}
