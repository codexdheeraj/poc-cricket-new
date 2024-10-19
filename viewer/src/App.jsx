import React, { useState, useEffect, useRef } from 'react';

const Viewer = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [streamStartTime, setStreamStartTime] = useState(null); // Stream start timestamp from the backend
  const [latency, setLatency] = useState(null);
  const videoRef = useRef(null); // Reference to the video element

  // Fetch the latest video and stream start time
  const fetchLatestVideo = async () => {
    try {
      const response = await fetch('http://localhost:3001/latest-video');
      const data = await response.json();
      
      if (data.filename) {
        const latestVideoUrl = `http://localhost:3001/uploads/${data.filename}`;
        setVideoUrl(latestVideoUrl);
        setStreamStartTime(data.streamStartTime); // Store stream start time
      } else {
        console.error('No new video found.');
      }
    } catch (error) {
      console.error('Error fetching latest video:', error);
    }
  };

  // Function to calculate latency
  const calculateLatency = () => {
    const viewerReceivedTime = Date.now();
    const latencyTime = viewerReceivedTime - streamStartTime;
    setLatency(latencyTime); // Set latency in milliseconds
  };

  // Auto-refresh when video ends
  const handleVideoEnd = async () => {
    console.log("Video ended");
    
    await fetchLatestVideo(); // Fetch the latest video after the current one ends

    // Check if there's a new video
    if (videoUrl === '') {
      // If no new video, replay the last video
      if (videoRef.current) {
        videoRef.current.currentTime = 0; // Reset to start
        videoRef.current.play(); // Replay the video
      }
    } else {
      // If there's a new video, attempt to play it
      if (videoRef.current) {
        videoRef.current.play()
          .then(() => {
            calculateLatency(); // Calculate latency once the new video starts playing
          })
          .catch(err => {
            console.error('Error playing new video:', err);
          });
      }
    }
  };

  // Use effect to fetch video and play
  useEffect(() => {
    fetchLatestVideo();
  }, []);

  // Automatically play the video when it is available
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.muted = true; // Mute the video to allow autoplay
      videoRef.current.play()
        .then(() => {
          calculateLatency(); // Calculate latency once video starts playing
        })
        .catch(err => {
          console.error('Error playing video:', err);
        });
    }
  }, [videoUrl]);

  return (
    <div>
      <h2>Viewer App</h2>
      {videoUrl ? (
        <div>
          <video 
            ref={videoRef}
            src={videoUrl}
            controls 
            width="600"
            onEnded={handleVideoEnd} // Auto-refresh when video ends
          />
          {latency !== null && (
            <p>Latency: {latency} ms</p>
          )}
        </div>
      ) : (
        <p>No video available.</p>
      )}
    </div>
  );
};

export default Viewer;
