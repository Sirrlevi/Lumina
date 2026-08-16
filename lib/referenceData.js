// Transparent local calibration bands. This is a deterministic heuristic,
// not a secretly trained attractiveness model.
// Each metric defines target ideal ratio and tolerance derived from classical
// facial proportion studies (e.g., neoclassical canons, Farkas anthropometry).
// scoreBand() maps deviation from target to 1-10 using linear penalty.
// Weights sum to 1.0 and reflect relative importance in PSL-style composite.
export const REFERENCE = {
  faceWidthHeight:{target:.78,tolerance:.13,weight:.10}, // width/height ~0.78 (oval ideal)
  jawToFace:{target:.76,tolerance:.12,weight:.13},
  jawToCheek:{target:.84,tolerance:.14,weight:.05},
  cheekToFace:{target:.73,tolerance:.11,weight:.08},
  eyeSpacingRatio:{target:.43,tolerance:.075,weight:.07}, // intercanthal ~1 eye width
  eyeAspectRatio:{target:.31,tolerance:.105,weight:.08},
  canthalTilt:{target:4,tolerance:6,weight:.06}, // degrees positive tilt
  facialThirdsDeviation:{target:.018,tolerance:.028,weight:.09,inverse:true},
  midfaceRatio:{target:.95,tolerance:.20,weight:.07},
  noseWidthRatio:{target:.19,tolerance:.06,weight:.06},
  mouthWidthRatio:{target:.43,tolerance:.10,weight:.04},
  symmetry:{target:9.2,tolerance:2.4,weight:.15},
  skin:{target:8,tolerance:2.5,weight:.07}
};
export const TIER_BANDS=[[3.5,'Sub-5'],[5,'LTN'],[6.2,'MTN'],[7.3,'HTN'],[8.3,'Chadlite'],[9.1,'Chad'],[10.01,'Adam']];
