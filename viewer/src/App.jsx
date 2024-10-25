import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const Viewer = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [streamStartTime, setStreamStartTime] = useState(null);
  const [latency, setLatency] = useState(null);
  const [latencyCalculated, setLatencyCalculated] = useState(false);
  const [recentVideos, setRecentVideos] = useState([]);
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
  const fetchRecentVideos = async () => {
    try {
      const response = await fetch('http://localhost:3001/recent-videos');
      const data = await response.json();
      setRecentVideos(data);
    } catch (error) {
      console.error('Error fetching recent videos:', error);
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

  const handleVideoSelect = (videoId, streamStartTime) => {
    const selectedVideoUrl = `http://localhost:3001/latest-video-stream/${videoId}`;
    setVideoUrl(selectedVideoUrl);
    setStreamStartTime(streamStartTime);
    setLatencyCalculated(false);
  };

  useEffect(() => {
    fetchLatestVideo();
    fetchRecentVideos();
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

      <h3 className="recent-videos-title">Recent Videos</h3>
      <ul className="recent-videos-list">
        {recentVideos.map(video => (
          <li key={video.id} className="recent-video-item">
            <button onClick={() => handleVideoSelect(video.id, video.streamStartTime)}>
              {video.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Viewer;
