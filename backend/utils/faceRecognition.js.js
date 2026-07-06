const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');
const fs = require('fs');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

async function loadModels() {
  const modelPath = path.join(__dirname, 'models'); // folder model face-api.js
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
}

async function detectFaces(imagePath) {
  await loadModels();

  const img = await canvas.loadImage(imagePath);
  const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();

  console.log(`Jumlah wajah terdeteksi: ${detections.length}`);
  return detections;
}

// Contoh pemakaian
detectFaces('./test-image.jpg')
  .then(detections => {
    // proses hasil deteksi di sini
  })
  .catch(err => console.error(err));
