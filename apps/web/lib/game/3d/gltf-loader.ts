import { useGLTF } from "@react-three/drei";

export const FARM_MODELS_PATH = "/models/farm";
export const FARM_DRACO_DECODER_PATH = `${FARM_MODELS_PATH}/draco/`;

export const FARM_MODEL_URLS = {
  world: `${FARM_MODELS_PATH}/world.glb`,
  friends: `${FARM_MODELS_PATH}/friends.glb`,
  fruit: `${FARM_MODELS_PATH}/fruit.glb`,
} as const;

useGLTF.setDecoderPath(FARM_DRACO_DECODER_PATH);

export function preloadFarmModels(): void {
  for (const url of Object.values(FARM_MODEL_URLS)) {
    useGLTF.preload(url);
  }
}
