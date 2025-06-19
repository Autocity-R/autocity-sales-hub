
-- Drop the old restrictive policy first
DROP POLICY IF EXISTS "Everyone can view active AI agents" ON ai_agents;

-- Create a comprehensive policy that allows all operations
DROP POLICY IF EXISTS "Allow all access to ai_agents" ON ai_agents;
CREATE POLICY "Allow all access to ai_agents" ON ai_agents FOR ALL USING (true);

-- Verify and fix other related tables if needed
DROP POLICY IF EXISTS "Allow all access to ai_sales_interactions" ON ai_sales_interactions;
CREATE POLICY "Allow all access to ai_sales_interactions" ON ai_sales_interactions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to ai_email_processing" ON ai_email_processing;
CREATE POLICY "Allow all access to ai_email_processing" ON ai_email_processing FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to email_response_suggestions" ON email_response_suggestions;
CREATE POLICY "Allow all access to email_response_suggestions" ON email_response_suggestions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to lead_scoring_history" ON lead_scoring_history;
CREATE POLICY "Allow all access to lead_scoring_history" ON lead_scoring_history FOR ALL USING (true);
