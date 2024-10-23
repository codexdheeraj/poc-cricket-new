import React, { useState, useEffect, useRef } from 'react';
import './App.css'; // Import the CSS file for styling

const Viewer = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [streamStartTime, setStreamStartTime] = useState(null);
  const [latency, setLatency] = useState(null);
  const [latencyCalculated, setLatencyCalculated] = useState(false); // New flag to track latency calculation
  const videoRef = useRef(null);

  const fetchLatestVideo = async () => {
    try {
      const response = await fetch('https://6ded-47-247-143-178.ngrok-free.app/latest-video', {
        method: "GET",
        headers: new Headers({
          "ngrok-skip-browser-warning": "69420",
        }),
      });

      const data = await response.json();

      if (data.filename) {
        const latestVideoUrl = `https://6ded-47-247-143-178.ngrok-free.app/uploads/${data.filename}`;
        
        // If a new video is fetched, reset the latency flag
        if (latestVideoUrl !== videoUrl) {
          setLatencyCalculated(false); // Reset flag for new video
        }

        setVideoUrl(latestVideoUrl);
        setStreamStartTime(data.streamStartTime);
      } else {
        console.error('No new video found.');
      }
    } catch (error) {
      console.error('Error fetching latest video:', error);
    }
  };

  const calculateLatency = () => {
    if (!latencyCalculated) { // Only calculate latency if it hasn't been done for the current video
      const viewerReceivedTime = Date.now();
      const latencyTime = viewerReceivedTime - streamStartTime;
      setLatency(latencyTime);
      setLatencyCalculated(true); // Mark latency as calculated for this video
    }
  };

  const handleVideoEnd = async () => {
    console.log("Video ended");
    
    await fetchLatestVideo();

    if (videoUrl === '') {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    } else {
      if (videoRef.current) {
        videoRef.current.play()
          .then(() => {
            calculateLatency(); // Only calculate latency for new videos
          })
          .catch(err => {
            console.error('Error playing new video:', err);
          });
      }
    }
  };

  useEffect(() => {
    fetchLatestVideo();
  }, []);

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play()
        .then(() => {
          calculateLatency(); // Calculate latency when the first video starts playing
        })
        .catch(err => {
          console.error('Error playing video:', err);
        });
    }
  }, [videoUrl]);

  return (
    <div className="viewer-container">
      <h2 className="viewer-title">Viewer App</h2>
      {videoUrl ? (
        <div>
          <div className="video-wrapper">
            <video 
              ref={videoRef}
              src={videoUrl}
              controls 
              className="video-player"
              onEnded={handleVideoEnd}
            />
          </div>
          <div>
            {latency !== null && (
              <p className="latency-info">Latency: {latency} ms</p> 
            )}
          </div>
        </div>
      ) : (
        <p className="no-video-message">No video available.</p>
      )}
    </div>
  );
};

export default Viewer;
