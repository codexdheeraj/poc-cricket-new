import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import '../App.css';

const backendUrl = 'http://localhost:3001'; // Backend URL

const Home = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [streamStartTime, setStreamStartTime] = useState(null);
  const [latency, setLatency] = useState(null);
  const [latencyCalculated, setLatencyCalculated] = useState(false);
  
  // Initialize the socket connection with ngrok skip header
  const socket = io(backendUrl, {
    extraHeaders: {
      'ngrok-skip-browser-warning': 'true',
    },
  });
  
  const videoRef = useRef(null);

  // Fetch the latest video
  const fetchLatestVideo = async () => {
    try {
      const response = await fetch(backendUrl + '/latest-video', {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const data = await response.json();
  
      if (data.url) {
        // Add a unique timestamp to avoid caching
        const latestVideoUrl = `${backendUrl}/uploads/live.webm?timestamp=${Date.now()}`;
        console.log('Latest video:', latestVideoUrl);
        setLatencyCalculated(false); // Reset flag for new video
  
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
    console.log("action", action);
    await fetch(backendUrl + '/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', // Add ngrok skip header here
      },
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

  useEffect(() => {
    socket.on('newVideoStatus', (data) => {
      console.log('New video status:', data.status);
      if (data.status === 'Available') {
        fetchLatestVideo();
      }
    });

    return () => {
      socket.off('newVideoStatus');
    };
  }, []);

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
