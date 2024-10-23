import React, { useState, useRef } from 'react';
import './App.css'; // Import the CSS file for styling
import RecordRTC from 'recordrtc';

const Streamer = () => {
  const [isRecording, setIsRecording] = useState(false);
  const videoRef = useRef(null);
  const recorderRef = useRef(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    videoRef.current.srcObject = stream;
    videoRef.current.play();

    const recorder = new RecordRTC(stream, {
      type: 'video',
      mimeType: 'video/x-matroska;codecs=avc1,mp4a',
      // or mimeType: 'video/webm;codecs=vp9,opus' as a fallback
      // If browsers do not support mp4 recording directly, you might have to convert server-side
    });
    recorderRef.current = recorder;
    recorder.startRecording();
    setIsRecording(true);
  };

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    recorder.stopRecording(() => {
      const blob = recorder.getBlob();
      const file = new File([blob], 'video.mkv', { type: 'video/x-matroska' });

      // Upload video to the server
      const formData = new FormData();
      formData.append('video', file);

      fetch('https://6ded-47-247-143-178.ngrok-free.app/upload', {
        method: 'POST',
        body: formData,
      })
        .then((res) => res.text())
        .then((result) => {
          console.log('Video uploaded successfully:', result);
        })
        .catch((err) => {
          console.error('Upload failed:', err);
        });
    });
    setIsRecording(false);

    // Stop video stream
    const tracks = videoRef.current.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
    videoRef.current.srcObject = null;
  };

  return (
    <div className="streamer-container">
      <h2 className="streamer-title">Streamer App</h2>
      <div className="video-wrapper">
        <video ref={videoRef} autoPlay muted className="video-player"></video>
      </div>
      <br />
      <button className={`record-button ${isRecording ? 'stop' : 'start'}`} onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
    </div>
  );
};

export default Streamer;
