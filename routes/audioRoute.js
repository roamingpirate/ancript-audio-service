import {getAudioFile, getAudioPart, retriveAnimationScriptData, retriveScriptData, uploadAudioFile, uploadScriptData} from '../database/s3.js'; 
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { FixedThreadPool, PoolEvents, availableParallelism } from 'poolifier'

// a fixed worker_threads pool
const pool = new FixedThreadPool(4, './audioCreateWorker.js', {
  onlineHandler: () => console.info('worker is online'),
  errorHandler: e => console.error(e),
})

pool.emitter?.on(PoolEvents.ready, () => console.info('Pool is ready'))
pool.emitter?.on(PoolEvents.busy, () => console.info('Pool is busy'))
pool.emitter?.on(PoolEvents.full, () => console.info('Pool is full'))


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


export const createAudio = async (projectId) => {
    console.log("Fetching audio...");
    const scriptData = await retriveScriptData(projectId);
    const animationScript = await retriveAnimationScriptData(projectId);
    let script = scriptData.scenes;

    const audioPartMap = new Map();
    const audioPartCreationPromises = [];
    let isAudioChanged = false;

    for (let i = 0; i < script.length; i++) {
        const sceneScript = script[i].script;
        for (let j = 0; j < sceneScript.length; j++) {
            const speechObj = sceneScript[j];
            if (speechObj["isChanged"] !== false) {
                console.log("zozi", "creating audio for " + i + j);
                isAudioChanged = true;
                const sceneIndex = i;
                const scriptIndex = j;

                audioPartCreationPromises.push(
                    pool.execute({ projectId, animationScript, sceneIndex, scriptIndex })
                      .then((result) => {
                        console.log("Audio created for " + i + j);
                        audioPartMap.set(`${i}${j}`, { i, j, result });
                      })
                      .catch((err) => {
                        console.error(`Error creating audio for ${i}${j}:`, err);
                        // Handle error (e.g., log it, retry the task, etc.)
                      })
                  );

                // const result = await createAudioForSpeech(projectId,animationScript, sceneIndex, scriptIndex);
                //             console.log("audio created for " + i + j);
                //             audioPartMap.set(`${i}${j}`, { i, j, result });         

            } else {
                console.log("zozi", "audio present for " + i + j);
            }
        }
    }

    await Promise.all(audioPartCreationPromises);

    if(isAudioChanged)
    {
        audioPartMap.forEach((value, key) => {
            console.log(`Key: ${key}, i: ${value.i}, j: ${value.j}, result: ${value.result}`);
            const sceneIndex = value.i;
            const scriptIndex = value.j;
            const scriptScene = scriptData["scenes"][sceneIndex];
            const scriptSceneScript = scriptScene["script"][scriptIndex];
            scriptSceneScript["audioPart"] = value.result;
            scriptSceneScript["isChanged"] = false;
            scriptData["scenes"][sceneIndex]["script"][scriptIndex]= scriptSceneScript;
        });

        script = scriptData.scenes;
        const audioFile = [];
        for(let i =0;i< script.length;i++) {
            const sceneAudioFile = [];
            const sceneScript = script[i].script;
            
            for(let j=0;j<sceneScript.length;j++)
            {
                const speechObj = sceneScript[j];
                if(speechObj["audioPart"] == undefined)
                {
                    sceneAudioFile.push([{audio: "", lipsync: ""}]);
                }
                else{
                    console.log("Fething audio")
                    const audioPartD = await getAudioPart(projectId, speechObj["audioPart"]);
                    sceneAudioFile.push(audioPartD);
                    console.log("audio fetched");
                }
    
                console.log(i+" "+j);
            
            }
            audioFile.push(sceneAudioFile);
        }   

        await uploadAudioFile(projectId,audioFile);  
        await uploadScriptData(projectId,scriptData);  
        return audioFile;
    }
    console.log("aaeyo");
    const result = await getAudioFile(projectId);
    return result;
}




export default createAudio;;