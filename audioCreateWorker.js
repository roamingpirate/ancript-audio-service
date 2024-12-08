import { createAudioForSpeech } from './bo/createAudioForSpeech.js';
import { ThreadWorker } from 'poolifier'

const func = async (task) => {
  try {
    const { projectId, animationScript, sceneIndex, scriptIndex } = task;
    const result = await createAudioForSpeech(projectId, animationScript, sceneIndex, scriptIndex);
    return result;
  } catch (error) {
    console.error(error.stack,"opps");
    return error.stack;
  }
};


export default new ThreadWorker(func, {
  maxInactiveTime: 60000,
})
