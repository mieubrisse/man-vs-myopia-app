-- Initialize the vision test database
CREATE TABLE IF NOT EXISTS vision_data (
    user_id VARCHAR(50) PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row for user "1"
INSERT INTO vision_data (user_id, data) 
VALUES ('1', '[]'::jsonb) 
ON CONFLICT (user_id) DO NOTHING;