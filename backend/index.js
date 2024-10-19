const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const app = express();
const port = 3001;

app.use(cors());

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Ensure .webm extension
  },
});

const upload = multer({ storage });

let streamStartTime = null; // Global variable to track stream start time

// Streamer upload endpoint
app.post('/upload', upload.single('video'), (req, res) => {
  const videoFile = req.file;
  
  // Get current timestamp in milliseconds when the streamer starts recording
  streamStartTime = Date.now();

  // Respond with the uploaded file info and stream start time
  if (videoFile) {
    res.json({
      message: 'Video uploaded successfully!',
      filename: videoFile.filename,
      streamStartTime: streamStartTime // Return timestamp of when recording started
    });
  } else {
    res.status(400).send('No video uploaded.');
  }
});

// API to get the latest video file and its recording timestamp
app.get('/latest-video', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');

  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).send('Error retrieving videos.');
    }

    const webmFiles = files.filter(file => file.endsWith('.webm'));
    const latestFile = webmFiles.sort((a, b) => {
      return fs.statSync(path.join(uploadsDir, b)).mtime - fs.statSync(path.join(uploadsDir, a)).mtime;
    })[0];

    if (latestFile) {
      res.json({ filename: latestFile, streamStartTime: streamStartTime });
    } else {
      res.status(404).json({ message: 'No videos found.' });
    }
  });
});


// Serve static files from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
