import mongoose from 'mongoose';
import dbConnect from './db';
import Professor from '@/models/professor';

/**
 * This script fixes duplicate emails in the professors collection by:
 * 1. Normalizing emails (trimming, converting to lowercase)
 * 2. Adding a suffix to duplicate emails to make them unique
 * 3. Rebuilding the unique index with case-insensitive collation
 */
export async function fixProfessorEmails() {
  try {
    await dbConnect();
    console.log('Connected to database');
    
    // Get all professors
    const professors = await Professor.find({}).lean();
    console.log(`Found ${professors.length} professors`);
    
    // Group professors by normalized email
    const emailGroups = new Map<string, any[]>();
    
    professors.forEach(prof => {
      if (!prof.email) return;
      
      const normalizedEmail = prof.email.trim().toLowerCase();
      const group = emailGroups.get(normalizedEmail) || [];
      group.push(prof);
      emailGroups.set(normalizedEmail, group);
    });
    
    // Find groups with more than one professor (duplicates)
    let fixCount = 0;
    
    for (const [email, group] of emailGroups.entries()) {
      if (group.length <= 1) continue;
      
      console.log(`Found ${group.length} professors with email ${email}`);
      
      // Keep the first one as is, update the others with a unique suffix
      for (let i = 1; i < group.length; i++) {
        const prof = group[i];
        const newEmail = `${email.split('@')[0]}+${i}@${email.split('@')[1]}`;
        
        await Professor.updateOne(
          { _id: prof._id },
          { $set: { email: newEmail } }
        );
        
        console.log(`Updated professor ${prof.name} (${prof._id}): ${email} -> ${newEmail}`);
        fixCount++;
      }
    }
    
    // Normalize all remaining emails
    const normalizeResult = await Professor.updateMany(
      {},
      [{ $set: { email: { $trim: { input: { $toLower: "$email" } } } } }]
    );
    
    console.log(`Fixed ${fixCount} duplicate emails`);
    console.log(`Normalized ${normalizeResult.modifiedCount} emails`);
    
    // Drop and recreate the email index with proper collation
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }
      
      await db.collection('professors').dropIndex('email_1');
      console.log('Dropped existing email index');
    } catch (err) {
      console.log('No existing email index to drop');
    }
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    await db.collection('professors').createIndex(
      { email: 1 },
      { 
        unique: true,
        collation: { locale: 'en', strength: 2 }
      }
    );
    
    console.log('Created new case-insensitive unique index on email');
    
    return {
      success: true,
      fixedCount: fixCount,
      normalizedCount: normalizeResult.modifiedCount
    };
  } catch (error) {
    console.error('Error fixing professor emails:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 