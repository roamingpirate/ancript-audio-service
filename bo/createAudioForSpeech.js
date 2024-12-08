import { exec } from "child_process";
import os from 'os';
import { promises as fs} from "fs";
import { retriveSpeakerData, uploadAudioFileWav, uploadAudioPart } from '../database/s3.js';
import dotenv from 'dotenv';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

dotenv.config();

// Executing External commands
const execCommand = (command) => {
      return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
          if (error) reject(error);
          resolve(stdout);
      });
      });
  };

  // Reading Lipsync file 
const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const textToSpeechClient = new TextToSpeechClient();


const lipSyncMessage = async (pid,i, j,k) => {
    const time = new Date().getTime();
    console.log(`Starting conversion for message ${k}${i}${j}`);
    const inputFilePath = `./public/audios/${pid}/dialog_${k}${i}${j}.mp3`;
    const outputFilePath = `./public/audios/${pid}/dialog_${k}${i}${j}.wav`
   // await convertAudioFile(inputFilePath,outputFilePath);
    console.log(`Conversion done in ${new Date().getTime() - time}ms`);

    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      // Windows: Use bin\\rhubarb.exe
      command = `bin_w\\rhubarb.exe -f json -o .\\public\\audios\\${pid}\\dialog_${k}${i}${j}.json .\\public\\audios\\${pid}\\dialog_${k}${i}${j}.wav -r phonetic`
    } else if (platform === 'linux') {
      // Linux: Use bin/rhubarb
      //command = `bin\\rhubarb.exe -f json -o .\\public\\audios\\${pid}\\dialog_${k}${i}${j}.json .\\public\\audios\\${pid}\\dialog_${k}${i}${j}.wav -r phonetic`
       command = `bin/rhubarb -f json -o ./public/audios/${pid}/dialog_${k}${i}${j}.json ./public/audios/${pid}/dialog_${k}${i}${j}.wav -r phonetic`
    } else {
      console.log('Unsupported platform:', platform);
      return;
    }

    try {
      await execCommand(command);
      console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
    } catch (error) {
      console.error(`Error during lip sync: ${error}`);
    }

  };

  const isFemaleSpeaker = (speakerName, speakersList) => {
    const speaker = speakersList.find(s => s.avatarName.toLowerCase() === speakerName.toLowerCase());
    return speaker ? speaker.vgender === "female" : true;
  };


  export const createAudioForSpeech = async (projectId, animationScript, k, i) => {
    let speakerList = await retriveSpeakerData(projectId);
    speakerList = speakerList.speakerList;
    const speechArr = animationScript[k].Script;
    const isFemale = isFemaleSpeaker(speechArr[i].Speaker, speakerList);
    const dialogArr = speechArr[i].Speech;
    let SpeechAudioData = [];

    for (let j = 0; j < dialogArr.length; j++) {
        let dialog = dialogArr[j].Text;

        if(dialog.trim() == "") {
            dialog = "a"; // Default to 'a' if the dialog is empty
        }

        console.log("Current Dialog: " + dialog);
        const fileName = `./public/audios/${projectId}/dialog_${k}${i}${j}.wav`;
        const jsonFileName = `./public/audios/${projectId}/dialog_${k}${i}${j}.json`;

        const directoryPath = `./public/audios/${projectId}/`;

        // Ensure the directory exists
        try {
            await fs.mkdir(directoryPath, { recursive: true });
        } catch (err) {
            console.error(`Error creating directory: ${err}`);
        }

        const request = {
            input: { text: dialog },
            voice: { languageCode: 'en-US', "name": isFemale ? "en-US-Journey-F" : "en-US-Journey-D" },
            audioConfig: { audioEncoding: 'LINEAR16' },
        };

        const [response] = await textToSpeechClient.synthesizeSpeech(request);
        console.log("popo")
        await fs.writeFile(fileName, response.audioContent); // Save the audio file
        console.log("tapu")
        console.log('File written successfully!');

        await lipSyncMessage(projectId, i, j, k);
        const audioFileUrl = await uploadAudioFileWav(`${projectId}_${i}_${j}_${k}`,fileName)
        const currentAudioData = {
            audio: audioFileUrl,
            lipsync: await readJsonTranscript(jsonFileName), // Read lipsync JSON
        };

        // Delete the audio file and JSON file after processing
        try {
            await fs.unlink(fileName); // Delete the audio file
            console.log(`Deleted audio file: ${fileName}`);

            await fs.unlink(jsonFileName); // Delete the JSON file
            console.log(`Deleted lipsync JSON file: ${jsonFileName}`);
        } catch (err) {
            console.error(`Error deleting files: ${err}`);
        }

        SpeechAudioData.push(currentAudioData); // Add data to array for further processing
    }

    //await fs.rmdir(`./public/audios/${projectId}`);

     const timestamp = Date.now();
     const audioPartName = `${projectId}_audio_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
     console.log(`${audioPartName}`);
     await uploadAudioPart(projectId,audioPartName, SpeechAudioData);
     console.log("audio part " + k + i +"uploaded");
     return audioPartName;
    //return SpeechAudioData;
};

  //createAudio(workerData.projectId, workerData.as);
