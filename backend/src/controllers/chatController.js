import { getMongoDb } from '../config/database.js';
import { sendMessage } from '../services/claudeService.js';
import { executeTool } from '../services/toolService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Handle chat messages with Claude
 */
export async function chat(req, res) {
  try {
    const { message, session_id } = req.body;
    const patientId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create session
    const sessionId = session_id || uuidv4();
    const mongodb = getMongoDb();
    const conversationsCollection = mongodb.collection('conversations');

    // Get existing conversation or create new one
    let conversation = await conversationsCollection.findOne({ session_id: sessionId });
    
    if (!conversation) {
      conversation = {
        session_id: sessionId,
        patient_id: patientId,
        messages: [],
        created_at: new Date(),
        updated_at: new Date()
      };
    }

    // Add user message to conversation
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Prepare messages for Claude (without timestamps)
    const claudeMessages = conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Send to Claude
    let claudeResponse = await sendMessage(claudeMessages);
    let finalResponse = '';
    let toolResults = [];

    // Handle tool calls in a loop (Claude might need multiple tool calls)
    while (claudeResponse.stop_reason === 'tool_use') {
      // Find all tool use blocks in the response
      const toolUseBlocks = claudeResponse.content.filter(
        block => block.type === 'tool_use'
      );

      // Execute all tools
      const toolResultBlocks = [];
      for (const toolBlock of toolUseBlocks) {
        const toolResult = await executeTool(
          toolBlock.name,
          toolBlock.input,
          patientId,
          token
        );

        toolResults.push({
          tool: toolBlock.name,
          input: toolBlock.input,
          result: toolResult
        });

        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Add assistant response with tool use
      conversation.messages.push({
        role: 'assistant',
        content: claudeResponse.content,
        timestamp: new Date()
      });

      // Add tool results
      conversation.messages.push({
        role: 'user',
        content: toolResultBlocks,
        timestamp: new Date()
      });

      // Prepare messages for next Claude call
      const updatedMessages = conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Get next response from Claude
      claudeResponse = await sendMessage(updatedMessages);
    }

    // Extract final text response
    const textBlocks = claudeResponse.content.filter(block => block.type === 'text');
    finalResponse = textBlocks.map(block => block.text).join('\n');

    // Add final assistant response
    conversation.messages.push({
      role: 'assistant',
      content: finalResponse,
      timestamp: new Date()
    });

    // Save conversation to MongoDB
    conversation.updated_at = new Date();
    await conversationsCollection.updateOne(
      { session_id: sessionId },
      { $set: conversation },
      { upsert: true }
    );

    res.json({
      session_id: sessionId,
      response: finalResponse,
      tool_calls: toolResults
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Get conversation history
 */
export async function getConversationHistory(req, res) {
  try {
    const { session_id } = req.params;
    const patientId = req.user.id;

    const mongodb = getMongoDb();
    const conversation = await mongodb.collection('conversations').findOne({
      session_id: session_id,
      patient_id: patientId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Filter out tool use messages for cleaner history
    const userFacingMessages = conversation.messages
      .filter(msg => typeof msg.content === 'string')
      .map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));

    res.json({
      session_id: conversation.session_id,
      messages: userFacingMessages,
      created_at: conversation.created_at
    });

  } catch (error) {
    console.error('Get conversation history error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation' });
  }
}
