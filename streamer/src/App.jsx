import React, { useState, useRef } from 'react';
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
      mimeType: 'video/webm',
    });
    recorderRef.current = recorder;
    recorder.startRecording();
    setIsRecording(true);
  };

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    recorder.stopRecording(() => {
      const blob = recorder.getBlob();
      const file = new File([blob], 'video.webm', { type: 'video/webm' });

      // Upload video to the server
      const formData = new FormData();
      formData.append('video', file);

      fetch('http://localhost:3001/upload', {
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
    <div>
      <h2>Streamer App</h2>
      <video ref={videoRef} autoPlay muted></video>
      <br />
      {!isRecording ? (
        <button onClick={startRecording}>Start Recording</button>
      ) : (
        <button onClick={stopRecording}>Stop Recording</button>
      )}
    </div>
  );
};

export default Streamer;
