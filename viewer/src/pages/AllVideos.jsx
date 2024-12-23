import React, { useEffect, useState, useRef } from "react";
import "./AllVideos.css";

const backendUrl = "http://localhost:3001"; // Backend URL

const options = {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  timeZoneName: "short",
};

const AllVideos = () => {
  const [recentVideos, setRecentVideos] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const videoRef = useRef(null);

  const fetchAllVideos = async () => {
    try {
      const response = await fetch(backendUrl + "/all-videos", {
        headers: {
          'ngrok-skip-browser-warning': 'true', // Add ngrok skip header here
        },
      });
      const data = await response.json();
      setRecentVideos(data);
    } catch (error) {
      console.error("Error fetching recent videos:", error);
    }
  };

  const handleVideoSelect = (videoId, streamStartTime) => {
    const selectedVideoUrl = backendUrl + `/video-stream/${videoId}`;
    setVideoUrl(selectedVideoUrl);
  };

  useEffect(() => {
    fetchAllVideos();
  }, []);

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      console.log("video url", videoUrl)
      videoRef.current.muted = true;
      videoRef.current
        .play()
        .then(() => {
          console.log("Playing video:", videoUrl);
        })
        .catch((err) => {
          console.error("Error playing video:", err);
        });
    }
  }, [videoUrl]);

  return (
    <div>
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
          </div>
        ) : (
          <p className="no-video-message">No video available.</p>
        )}
      </div>
      <div>
        <h3 className="recent-videos-title">All Videos</h3>
        <ul className="recent-videos-list">
          {recentVideos.map(video => (
            <li key={video.id} className="recent-video-item">
              <button onClick={() => handleVideoSelect(video.id, video.streamStartTime)}>
                {video.id + " " + video.name + " " + new Intl.DateTimeFormat('en-US', options).format(new Date(video.streamStartTime))}
                {console.log(video)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AllVideos;
