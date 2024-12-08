import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import fs from 'fs';
//import { projects } from "elevenlabs/api";

dotenv.config();

const streamToString = (stream) => {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      stream.on('error', reject);
      stream.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf-8'));
      });
    });
  };

const s3 = new S3Client({
    region: process.env.S3BUCKET_REGION,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY,
      secretAccessKey: process.env.SECRET_KEY
    }
  });


const bucketName = process.env.S3BUCKET_NAME;


export const retriveSpeakerData = async (projectId) => {
  const speakerDataKey = `${projectId}/speaker.json`;

  try {
      const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: speakerDataKey,
      });

      const dataStream = await s3.send(command);
      const data = await streamToString(dataStream.Body);

      return JSON.parse(data);
  } catch (err) {
      if (err.name === 'NoSuchKey') {
          console.log(`Speakerr data not found for project: ${projectId}`);
          return [];
      }

      console.error("Error: " + err.message);
      throw err;
  }
};

export const uploadAudioFileWav = async (audioName, audioFilePath) => {
  const audioDataKey = `${audioName}.wav`;

  try {
      const audioFileBuffer = await fs.promises.readFile(audioFilePath);

      const params = {
          Bucket: 'ancript-audios',
          Key: audioDataKey,
          Body: audioFileBuffer,
          ContentType: 'audio/wav',
      };

      const data = await s3.send(new PutObjectCommand(params));
      console.log("Audio Uploaded Successfully");

      const audioUrl = `https://${params.Bucket}.s3.amazonaws.com/${audioDataKey}`;
      return audioUrl;
  } catch (err) {
      console.log("Error in uploading Audio");
      console.log(err.message);
      throw err;
  }
};

export const uploadAudioPart = async (projectId,audioPartName,audioPartData) => {
  const audioDataKey = `${projectId}/audio/${audioPartName}.json`;

  try{
      const params = {
          Bucket: bucketName,
          Key: audioDataKey,
          Body: JSON.stringify(audioPartData),
          ContentType: 'application/json'
      }

      const data = await s3.send(new PutObjectCommand(params));
      console.log("Audio Part Uploaded Successfully");
  }
  catch(err)
  {
      console.log("Error in uploading Audio Part");
      console.log(err.message);
      throw err;
  }   
}

export const getAudioFile = async (projectId) => {
  const audioDataKey = `${projectId}/audio.json`;

  try{
      const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: audioDataKey,
        });

        const dataStream = await s3.send(command);
        const data = await streamToString(dataStream.Body);
        
        return JSON.parse(data);
  }
  catch(err)
  {
      console.log("File Dont Exist");
      console.log(err.message);
      return { data : "File dont exist", status : 0};
  }   
}

export const getAudioPart = async (projectId,audioPartName) => {
  const audioDataKey = `${projectId}/audio/${audioPartName}.json`;

  try{
      const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: audioDataKey,
        });

        const dataStream = await s3.send(command);
        const data = await streamToString(dataStream.Body);
        
        return JSON.parse(data);
  }
  catch(err)
  {
      console.log("File Dont Exist");
      console.log(err.message);
      return { data : "File dont exist", status : 0};
  }   
}

export const retriveAnimationScriptData = async (projectId) => {
  const scriptDataKey = `${projectId}/animationScript.json`;

  try{
      const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: scriptDataKey,
        });

        const dataStream = await s3.send(command);
        const data = await streamToString(dataStream.Body);
        
        return JSON.parse(data);
    
  }
  catch(err){
      console.log("error"+err.message);
  }
}

export const retriveScriptData = async (projectId) => {
  const scriptDataKey = `${projectId}/script.json`;

  try {
      const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: scriptDataKey,
      });

      const dataStream = await s3.send(command);
      const data = await streamToString(dataStream.Body);
      
      return JSON.parse(data);
  } catch (err) {
      if (err.name === 'NoSuchKey') {
          console.log("Item not found, returning empty array");
          return {scenes: []};
      } else {
          console.log("Error: " + err.message);
          throw err;
      }
  }
};

export const uploadScriptData = async (projectId,scriptData) => {
  const scriptDataKey = `${projectId}/script.json`;

  try{
      const params = {
          Bucket: bucketName,
          Key: scriptDataKey,
          Body: JSON.stringify(scriptData),
          ContentType: 'application/json'
      }

      const data = await s3.send(new PutObjectCommand(params));
      console.log("Script Uploaded Successfully");
  }
  catch(err)
  {
      console.log("Error in uploading script");
      console.log(err.message);
  }

}

export const uploadAudioFile = async (projectId,audioData) => {
  const audioDataKey = `${projectId}/audio.json`;

  try{
      const params = {
          Bucket: bucketName,
          Key: audioDataKey,
          Body: JSON.stringify(audioData),
          ContentType: 'application/json'
      }

      const data = await s3.send(new PutObjectCommand(params));
      console.log("Audio Uploaded Successfully");
  }
  catch(err)
  {
      console.log("Error in uploading Audio");
      console.log(err.message);
      throw err;
  }   
}
