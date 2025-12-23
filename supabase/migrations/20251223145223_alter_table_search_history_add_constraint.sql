ALTER TABLE search_history 
ADD CONSTRAINT search_history_user_query_unique 
UNIQUE (user_id, query);