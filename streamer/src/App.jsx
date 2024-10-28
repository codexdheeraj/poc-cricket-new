import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css'; // Import the CSS file for styling
import RecordRTC from 'recordrtc';

const Streamer = () => {
  const videoRef = useRef(null);
  const recorderRef = useRef(null);
  const socket = io('http://localhost:3001');

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
  
    console.log("Stream started:", stream);
    videoRef.current.srcObject = stream;
    videoRef.current.play();
  
    const recorder = new RecordRTC(stream, {
      type: 'video',
      mimeType: 'video/x-matroska;codecs=avc1,mp4a',
    });
    recorderRef.current = recorder;
    recorder.startRecording();
    console.log("Recording started");
  };

  const stopRecording = async () => {
    const recorder = recorderRef.current;
  
    // Check if recorder is defined
    if (!recorder) {
      console.error("No recorder found");
      return;
    }
  
    // Stop the recording and get the blob
    recorder.stopRecording(async () => {
      const blob = await recorder.getBlob();
      const file = new File([blob], 'video.mkv', { type: 'video/x-matroska' });
  
      // Upload video to the server
      const formData = new FormData();
      formData.append('video', file);
      await fetch('http://localhost:3001/upload', {
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

    // Stop video stream
    const stream = videoRef.current.srcObject;
    if (stream) {
      const tracks = stream.getTracks();
      console.log("Stopping tracks:", tracks);
      tracks.forEach((track) => {
        console.log("Stopping track:", track);
        track.stop();
      });
      videoRef.current.srcObject = null; // This will close the camera
      console.log("Camera closed");
    } else {
      console.warn("No stream found");
    }
  
    // Reset the recorder reference
    recorderRef.current = null;
    console.log("Recorder reference cleared");
  };
  
  useEffect(() => {
    const handleRecordingStatus = async (data) => {
      console.log("Recording status received:", data.status);
      if (data.status === 'Recording') {
        await startRecording();
      } else {
        await stopRecording();
      }
    };

    socket.on('recordingStatus', handleRecordingStatus);

    return () => {
      socket.off('recordingStatus', handleRecordingStatus); // Clean up socket listener

      const stream = videoRef.current.srcObject;
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach((track) => {
          console.log("Stopping track on unmount:", track);
          track.stop();
        });
        videoRef.current.srcObject = null; // Clean up on unmount
      }
      console.log("Streamer component unmounted");
    };
  }, []);

  return (
    <div className="streamer-container">
      <h2 className="streamer-title">Streamer App</h2>
      <div className="video-wrapper">
        <video ref={videoRef} autoPlay muted className="video-player"></video>
      </div>
      <br />
    </div>
  );
};

export default Streamer;
