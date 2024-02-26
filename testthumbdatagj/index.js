
// Imports
const {Storage} = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');


// Entry point function
exports.gcf_generate_thumbnails = async (file, context) => {
    const gcsFile = file;
    const storage = new Storage();
    const sourceBucket = storage.bucket(gcsFile.bucket);
    

//Logging the file's path
console.log(`File name: ${gcsFile.name}`);


//Creating a working directory on the VM to download the file
const workingDir = path.join(os.tmpdir(), 'uploads');

//Creating a variable that holds the path to the local version of the file
const tempFilePath = path.join(workingDir, gcsFile.name);

//Wait until the working directory is ready 
await fs.ensureDir(workingDir);

//Download the original file to the path on the VM
await sourceBucket.file(gcsFile.name).download({
    destination: tempFilePath
});

//Delete the temp working directory and its files from the Cloud Function's VM
await fs.remove(workingDir);

//Logging a message indicating the deletion
console.log(`Deleted temporary directory: ${workingDir}`);

}

//v2



// Entry point function
exports.gcf_generate_thumbnails = async (file, context) => {
    const gcsFile = file;
    const storage = new Storage();
    const sourceBucket = storage.bucket(gcsFile.bucket);
    

//Logging the file's path
console.log(`File name: ${gcsFile.name}`);


//Creating a working directory on the VM to download the file
const workingDir = path.join(os.tmpdir(), 'uploads');

//Creating a variable that holds the path to the local version of the file
const tempFilePath = path.join(workingDir, gcsFile.name);

//Wait until the working directory is ready 
await fs.ensureDir(workingDir);

//Download the original file to the path on the VM
await sourceBucket.file(gcsFile.name).download({
    destination: tempFilePath
});

//Logging the file's path
console.log(`Download file to: ${tempFilePath}`);

//Delete the temp working directory and its files from the Cloud Function's VM
await fs.remove(workingDir);

//Logging a message indicating the deletion
console.log(`Deleted temporary directory: ${workingDir}`);


}

//v3
// Imports
const getExif = require('exif-async');
const parseDMS = require('parse-dms');

// Entry Point Function
async function extractExif() {
    let gpsObject = await readExifData('china1.jpeg');
    console.log(gpsObject);
    let gpsDecimal = getGPSCoordinates(gpsObject);
    console.log(gpsDecimal);
    console.log(gpsDecimal.lat);
    console.log(gpsDecimal.lon);
}

// Call the Entry Point (not needed in GCF)
extractExif();


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