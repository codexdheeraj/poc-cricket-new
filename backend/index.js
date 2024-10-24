const express = require('express'); 
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
require('dotenv').config(); // Load environment variables

const app = express();
const port = 3001;

app.use(cors());
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});
// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Define a Mongoose schema for storing video data
const videoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  streamStartTime: { type: Date, required: true },
});

const Video = mongoose.model('Video', videoSchema);

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Save with the original file extension
  },
});

const upload = multer({ storage });

let streamStartTime = null; // Global variable to track stream start time

// Streamer upload endpoint
app.post('/upload', upload.single('video'), async (req, res) => {
  const videoFile = req.file;
  
  // Get current timestamp in milliseconds when the streamer starts recording
  streamStartTime = Date.now();

  if (videoFile) {
    try {
      // Upload video to Cloudinary
      const result = await cloudinary.uploader.upload(videoFile.path, {
        resource_type: 'video',
      });

      // Store video URL and stream start time in MongoDB
      const newVideo = new Video({
        url: result.secure_url, // Store the URL from Cloudinary
        streamStartTime: new Date(streamStartTime), // Store timestamp
      });

      await newVideo.save();

      // Remove the file after uploading to Cloudinary
      fs.unlinkSync(videoFile.path);

      res.json({
        message: 'Video uploaded successfully!',
        url: result.secure_url,
        streamStartTime: streamStartTime,
      });
    } catch (error) {
      console.error('Error uploading video to Cloudinary:', error);
      res.status(500).send('Error uploading video.');
    }
  } else {
    res.status(400).send('No video uploaded.');
  }
});

// API to get the latest video file and its recording timestamp
app.get('/latest-video', async (req, res) => {
  try {
    const latestVideo = await Video.findOne().sort({ streamStartTime: -1 }).exec();

    if (latestVideo) {
      res.json({
        url: latestVideo.url,
        streamStartTime: latestVideo.streamStartTime,
      });
    } else {
      res.status(404).json({ message: 'No videos found.' });
    }
  } catch (error) {
    res.status(500).send('Error retrieving videos.');
  }
});

// Serve static files from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
