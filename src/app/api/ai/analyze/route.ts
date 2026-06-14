import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeIntelligence,
  rotateGeminiApiKey,
  type IntelligenceContext,
} from '@/lib/ai-engine';