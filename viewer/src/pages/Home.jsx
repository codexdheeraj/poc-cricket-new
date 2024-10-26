import React, { useState, useEffect, useRef } from 'react';
import '../App.css';

const Home = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [streamStartTime, setStreamStartTime] = useState(null);
  const [latency, setLatency] = useState(null);
  const [latencyCalculated, setLatencyCalculated] = useState(false);
  
  const videoRef = useRef(null);

  // Fetch the latest video
  const fetchLatestVideo = async () => {
    try {
      const response = await fetch('http://localhost:3001/latest-video');
      const data = await response.json();

      if (data.url) {
        const latestVideoUrl = `http://localhost:3001${data.url}`;
        
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

  // Fetch the recent videos list


  const calculateLatency = () => {
    if (!latencyCalculated) {
      const viewerReceivedTime = Date.now();
      const streamStartTimestamp = new Date(streamStartTime).getTime();
      const latencyTime = viewerReceivedTime - streamStartTimestamp;
      setLatency(latencyTime);
      setLatencyCalculated(true);
    }
  };

  const handleVideoEnd = async () => {
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
            calculateLatency();
          })
          .catch(err => {
            console.error('Error playing new video:', err);
          });
      }
    }
  };
  const handleAction = async (action) => {
    console.log("action", action)
    await fetch('http://localhost:3001/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
  };

  useEffect(() => {
    fetchLatestVideo();
  }, []);

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play()
        .then(() => {
          calculateLatency();
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
      <div>
        <button className="action-button" onClick={() => handleAction('start')}>Start Recording</button>
        <button className="action-button" onClick={() => handleAction('stop')}>Stop Recording</button>
      </div>
    </div>
  );
};

export default Home;
