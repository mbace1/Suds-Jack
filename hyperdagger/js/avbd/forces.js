// Ported to plain JS for Hyper Dagger from three-avbd (MIT, (c) Steven Bobyn),
// itself a faithful port of avbd-demo3d (MIT, (c) Chris Giles) — Augmented Vertex
// Block Descent, Giles, Diaz & Yuksel, SIGGRAPH 2025. Types stripped mechanically;
// nothing else changed. See THIRD_PARTY.md in this folder.
// Joint, Spring and IgnoreCollision, ported from avbd-demo3d (joint.cpp, spring.cpp, solver.h).

import { Force, PENALTY_MAX, PENALTY_MIN,                             } from './body.js?v=1';
import {
  abs3,
  addm,
  addScaled3,
  clamp,
  cross,
  diagonal,
  diagonalize,
  div3,
  length,
  lengthSq,
  mat3,
  min,
  mul,
  mulv,
  neg3,
  outer,
  qsub,
  quat,
  rotate,
  scale3,
  scalem,
  set3,
  skew,
  sub3,
  transform,
  transpose,
  vec3,
          
          
} from './math.js?v=1';
                                          

const IDENTITY = quat();

// Scratch shared by the (single-threaded) primal/dual updates
const K = mat3();
const jLin = mat3();
const jAng = mat3();
const jLinT = mat3();
const jAngT = mat3();
const jAngTk = mat3();
const tmp = mat3();
const H = mat3();
const gs = mat3();
const C = vec3();
const F = vec3();
const r = vec3();
const pA = vec3();
const pB = vec3();

/** geometricStiffnessBallSocket(k, v): -v[k]·I with v added to column k. */
function geometricStiffnessBallSocket(out    , k        , v    )     {
  diagonal(out, -v[k], -v[k], -v[k]);
  out[k] += v[0];
  out[3 + k] += v[1];
  out[6 + k] += v[2];
  return out;
}

const componentMin = (out    , a    , b        )     => set3(out, min(a[0], b), min(a[1], b), min(a[2], b));

/**
 * Ball-socket joint (linear rows) plus an angle lock (angular rows), with optional fracture
 * on the angular force. Stiffness Infinity makes a row hard (dual variable + stabilization);
 * a finite stiffness makes it a spring; 0 disables it. When bodyA is null, rA is a world point.
 */
export class Joint extends Force {
           rA    ;
           rB    ;
           C0Lin = vec3();
           C0Ang = vec3();
           penaltyLin = vec3();
           penaltyAng = vec3();
           lambdaLin = vec3();
           lambdaAng = vec3();
  stiffnessLin        ;
  stiffnessAng        ;
  fracture        ;
  torqueArm        ;
  broken = false;

  constructor(
    solver        ,
    bodyA              ,
    bodyB       ,
    rA                   ,
    rB                   ,
    stiffnessLin = Infinity,
    stiffnessAng = 0,
    fracture = Infinity,
  ) {
    super(solver, bodyA, bodyB);
    this.rA = vec3(rA[0], rA[1], rA[2]);
    this.rB = vec3(rB[0], rB[1], rB[2]);
    this.stiffnessLin = stiffnessLin;
    this.stiffnessAng = stiffnessAng;
    this.fracture = fracture;
    const s = bodyA ? bodyA.size : [0, 0, 0];
    this.torqueArm = lengthSq([s[0] + bodyB.size[0], s[1] + bodyB.size[1], s[2] + bodyB.size[2]]);
  }

  /** Linear constraint: anchor A minus anchor B, in world space. */
  evaluateLin(out    )     {
    const { bodyA, bodyB } = this;
    if (bodyA) transform(pA, bodyA.positionLin, bodyA.positionAng, this.rA);
    else pA.set(this.rA);
    return sub3(out, pA, transform(pB, bodyB.positionLin, bodyB.positionAng, this.rB));
  }

  /** Angular constraint: relative rotation vector, scaled by torqueArm to length units. */
  evaluateAng(out    )     {
    qsub(out, this.bodyA ? this.bodyA.positionAng : IDENTITY, this.bodyB.positionAng);
    return scale3(out, out, this.torqueArm);
  }

  initialize()          {
    const { solver } = this;
    // C(x-) at the start of the step
    this.evaluateLin(this.C0Lin);
    this.evaluateAng(this.C0Ang);

    // Warm-start the dual variables and penalty parameters (Eq. 19), clamped to material stiffness
    for (let i = 0; i < 3; i++) {
      this.lambdaLin[i] = this.lambdaLin[i] * solver.alpha * solver.gamma;
      this.lambdaAng[i] = this.lambdaAng[i] * solver.alpha * solver.gamma;
      this.penaltyLin[i] = clamp(this.penaltyLin[i] * solver.gamma, PENALTY_MIN, PENALTY_MAX);
      this.penaltyAng[i] = clamp(this.penaltyAng[i] * solver.gamma, PENALTY_MIN, PENALTY_MAX);
    }
    componentMin(this.penaltyLin, this.penaltyLin, this.stiffnessLin);
    componentMin(this.penaltyAng, this.penaltyAng, this.stiffnessAng);

    return !this.broken;
  }

  updatePrimal(body       , alpha        , sys            )       {
    const isA = body === this.bodyA;

    // Linear constraint
    if (lengthSq(this.penaltyLin) > 0) {
      diagonal(K, this.penaltyLin[0], this.penaltyLin[1], this.penaltyLin[2]);
      this.evaluateLin(C);

      // Stabilization
      if (this.stiffnessLin === Infinity) addScaled3(C, C, this.C0Lin, -alpha);

      // Force
      mulv(F, K, C);
      addScaled3(F, F, this.lambdaLin, 1);

      // Jacobians for this body
      const sgn = isA ? 1 : -1;
      diagonal(jLin, sgn, sgn, sgn);
      if (isA) skew(jAng, neg3(r, rotate(r, this.bodyA .positionAng, this.rA)));
      else skew(jAng, rotate(r, this.bodyB.positionAng, this.rB));

      // Stamp into LHS
      transpose(jLinT, jLin);
      transpose(jAngT, jAng);
      mul(jAngTk, jAngT, K);
      addm(sys.lhsLin, mul(tmp, mul(tmp, jLinT, K), jLin));
      addm(sys.lhsAng, mul(tmp, jAngTk, jAng));
      addm(sys.lhsCross, mul(tmp, jAngTk, jLin));

      // Diagonal approximation of the higher-order (geometric stiffness) terms
      if (isA) rotate(r, this.bodyA .positionAng, this.rA);
      else neg3(r, rotate(r, this.bodyB.positionAng, this.rB));
      scalem(H, geometricStiffnessBallSocket(gs, 0, r), F[0]);
      addm(H, scalem(gs, geometricStiffnessBallSocket(gs, 1, r), F[1]));
      addm(H, scalem(gs, geometricStiffnessBallSocket(gs, 2, r), F[2]));
      addm(sys.lhsAng, diagonalize(tmp, H));

      // Stamp into RHS
      addScaled3(sys.rhsLin, sys.rhsLin, mulv(r, jLinT, F), 1);
      addScaled3(sys.rhsAng, sys.rhsAng, mulv(r, jAngT, F), 1);
    }

    // Angular constraint
    if (lengthSq(this.penaltyAng) > 0) {
      diagonal(K, this.penaltyAng[0], this.penaltyAng[1], this.penaltyAng[2]);
      this.evaluateAng(C);

      if (this.stiffnessAng === Infinity) addScaled3(C, C, this.C0Ang, -alpha);

      mulv(F, K, C);
      addScaled3(F, F, this.lambdaAng, 1);

      const s = (isA ? 1 : -1) * this.torqueArm;
      diagonal(jAng, s, s, s);
      transpose(jAngT, jAng);
      addm(sys.lhsAng, mul(tmp, mul(tmp, jAngT, K), jAng));
      addScaled3(sys.rhsAng, sys.rhsAng, mulv(r, jAngT, F), 1);
    }
  }

  updateDual(alpha        )       {
    const { solver } = this;

    // Linear constraint
    if (lengthSq(this.penaltyLin) > 0) {
      diagonal(K, this.penaltyLin[0], this.penaltyLin[1], this.penaltyLin[2]);
      this.evaluateLin(C);
      if (this.stiffnessLin === Infinity) {
        addScaled3(C, C, this.C0Lin, -alpha);
        mulv(F, K, C);
        addScaled3(this.lambdaLin, F, this.lambdaLin, 1);
      }
      // Ramp the penalty, clamped to material stiffness (Eq. 16)
      addScaled3(this.penaltyLin, this.penaltyLin, abs3(r, C), solver.betaLin);
      componentMin(this.penaltyLin, this.penaltyLin, min(this.stiffnessLin, PENALTY_MAX));
    }

    // Angular constraint
    if (lengthSq(this.penaltyAng) > 0) {
      diagonal(K, this.penaltyAng[0], this.penaltyAng[1], this.penaltyAng[2]);
      this.evaluateAng(C);
      if (this.stiffnessAng === Infinity) {
        addScaled3(C, C, this.C0Ang, -alpha);
        mulv(F, K, C);
        addScaled3(this.lambdaAng, F, this.lambdaAng, 1);
      }
      addScaled3(this.penaltyAng, this.penaltyAng, abs3(r, C), solver.betaAng);
      componentMin(this.penaltyAng, this.penaltyAng, min(this.stiffnessAng, PENALTY_MAX));
    }

    // Fracture
    if (lengthSq(this.lambdaAng) > this.fracture * this.fracture) {
      this.penaltyLin.fill(0);
      this.penaltyAng.fill(0);
      this.lambdaLin.fill(0);
      this.lambdaAng.fill(0);
      this.broken = true;
    }
  }
}

/** Standard spring between two anchors; rest < 0 takes the current distance. */
export class Spring extends Force {
           rA    ;
           rB    ;
  rest        ;
  stiffness        ;

  constructor(solver        , bodyA       , bodyB       , rA                   , rB                   , stiffness        , rest = -1) {
    super(solver, bodyA, bodyB);
    this.rA = vec3(rA[0], rA[1], rA[2]);
    this.rB = vec3(rB[0], rB[1], rB[2]);
    this.stiffness = stiffness;
    this.rest = rest;
    if (this.rest < 0) {
      transform(pA, bodyA.positionLin, bodyA.positionAng, this.rA);
      transform(pB, bodyB.positionLin, bodyB.positionAng, this.rB);
      this.rest = length(sub3(C, pA, pB));
    }
  }

  initialize()          {
    return true;
  }

  updatePrimal(body       , _alpha        , sys            )       {
    const bodyA = this.bodyA ;
    const bodyB = this.bodyB;
    transform(pA, bodyA.positionLin, bodyA.positionAng, this.rA);
    transform(pB, bodyB.positionLin, bodyB.positionAng, this.rB);
    const d = sub3(C, pA, pB);
    const dLen = length(d);
    if (dLen <= 1.0e-6) return;

    const n = div3(F, d, dLen);
    const c = dLen - this.rest;
    const f = this.stiffness * c;

    const jl = pA;
    const ja = pB;
    if (body === bodyA) {
      rotate(r, bodyA.positionAng, this.rA);
      jl.set(n);
      cross(ja, r, n);
    } else {
      rotate(r, bodyB.positionAng, this.rB);
      neg3(jl, n);
      neg3(ja, cross(ja, r, n));
    }

    addm(sys.lhsLin, scalem(tmp, outer(tmp, jl, jl), this.stiffness));
    addm(sys.lhsAng, scalem(tmp, outer(tmp, ja, ja), this.stiffness));
    addm(sys.lhsCross, scalem(tmp, outer(tmp, ja, jl), this.stiffness));
    addScaled3(sys.rhsLin, sys.rhsLin, scale3(r, jl, f), 1);
    addScaled3(sys.rhsAng, sys.rhsAng, scale3(r, ja, f), 1);
  }

  updateDual()       {}
}

/** No physical effect; stops the broadphase creating a contact manifold for the pair. */
export class IgnoreCollision extends Force {
  initialize()          {
    return true;
  }
  updatePrimal()       {}
  updateDual()       {}
}
