import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import ProfessorDuty from '@/models/professorDuty';
import Professor from '@/models/professor';
import Room from '@/models/room';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    console.log('Connected to database...');
    
    // Get all models
    const models = Object.keys(mongoose.models);
    console.log('Registered models:', models);
    
    // Try to inspect the ProfessorDuty model schema
    const schema = ProfessorDuty.schema;
    const paths = Object.keys(schema.paths);
    console.log('ProfessorDuty schema paths:', paths);
    
    // Check if schedule is required
    const requiredPaths = paths.filter(path => {
      const pathConfig = schema.paths[path];
      return pathConfig.isRequired;
    });
    
    console.log('Required paths:', requiredPaths);
    
    // Create a test duty to check validation
    try {
      const professors = await Professor.find().limit(1);
      const rooms = await Room.find().limit(1);
      
      if (professors.length > 0 && rooms.length > 0) {
        const testDuty = new ProfessorDuty({
          professor: professors[0]._id,
          room: rooms[0]._id,
          date: new Date(),
          shift: 'Morning',
          startTime: '09:00',
          endTime: '12:00'
        });
        
        await testDuty.validate();
        console.log('Model validation successful!');
        
        // Don't save, just clean up
        await ProfessorDuty.deleteOne({ _id: testDuty._id });
      }
    } catch (validationError) {
      console.error('Model validation failed:', validationError);
    }
    
    return NextResponse.json({
      status: 'ok',
      models,
      professorDutySchema: paths,
      requiredPaths
    });
  } catch (error) {
    console.error('Test DB error:', error);
    return NextResponse.json(
      { error: 'Failed to test database', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
} 