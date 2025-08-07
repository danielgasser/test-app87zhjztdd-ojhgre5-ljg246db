SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', 'edd25c26-b66a-400d-9a13-3d230a4e9411', '{"action":"user_confirmation_requested","actor_id":"572aa506-5d2c-4a28-9e7c-a5b4be39a033","actor_username":"daniel@daniel-gasser.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-07-18 18:30:12.526958+00', ''),
	('00000000-0000-0000-0000-000000000000', '7636173d-99cb-44d7-b131-2bd16fdb2393', '{"action":"user_recovery_requested","actor_id":"572aa506-5d2c-4a28-9e7c-a5b4be39a033","actor_username":"daniel@daniel-gasser.com","actor_via_sso":false,"log_type":"user"}', '2025-07-18 20:09:01.010391+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c3e9c873-cec4-44ca-920c-3b9d348ba1ab', '{"action":"user_signedup","actor_id":"572aa506-5d2c-4a28-9e7c-a5b4be39a033","actor_username":"daniel@daniel-gasser.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-07-18 20:10:41.872788+00', ''),
	('00000000-0000-0000-0000-000000000000', '25c72cce-525f-4d10-9d51-f3d227461d7b', '{"action":"user_confirmation_requested","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-07-18 20:16:42.450204+00', ''),
	('00000000-0000-0000-0000-000000000000', '64d1d911-2e2f-4a6f-bca6-d83af4371d48', '{"action":"user_signedup","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-07-18 20:18:04.802914+00', ''),
	('00000000-0000-0000-0000-000000000000', '8c38c4c5-5c4d-4649-8988-8ee7439a14db', '{"action":"user_signedup","actor_id":"88bb1b77-a84e-4c13-a787-0ff4b797376d","actor_username":"software@daniel-gasser.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-07-18 20:20:51.24744+00', ''),
	('00000000-0000-0000-0000-000000000000', '1550db8f-8ba2-451d-a05e-2708edfbe8a3', '{"action":"login","actor_id":"88bb1b77-a84e-4c13-a787-0ff4b797376d","actor_username":"software@daniel-gasser.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-18 20:20:51.251369+00', ''),
	('00000000-0000-0000-0000-000000000000', '36b591c8-ee99-426e-a748-ccb2ac970b37', '{"action":"token_refreshed","actor_id":"88bb1b77-a84e-4c13-a787-0ff4b797376d","actor_username":"software@daniel-gasser.com","actor_via_sso":false,"log_type":"token"}', '2025-07-18 21:19:03.568881+00', ''),
	('00000000-0000-0000-0000-000000000000', '14e08782-6467-4301-8eba-295b53663b2b', '{"action":"token_revoked","actor_id":"88bb1b77-a84e-4c13-a787-0ff4b797376d","actor_username":"software@daniel-gasser.com","actor_via_sso":false,"log_type":"token"}', '2025-07-18 21:19:03.570365+00', ''),
	('00000000-0000-0000-0000-000000000000', 'df4e99ce-4bfe-494a-aa44-be25af4ada8b', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-19 09:27:42.927315+00', ''),
	('00000000-0000-0000-0000-000000000000', '1cfd0322-72b5-4920-bc66-060720c0a86a', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-19 10:26:01.720243+00', ''),
	('00000000-0000-0000-0000-000000000000', '5ed14934-63e2-4aa3-a92e-ab1e9e45ef30', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-19 10:26:01.721726+00', ''),
	('00000000-0000-0000-0000-000000000000', '55784697-1d40-4277-b4e2-d7c21cd3650e', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-19 11:24:21.474281+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a97782a1-2dcc-450f-ad07-975b87aff083', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-19 11:24:21.47515+00', ''),
	('00000000-0000-0000-0000-000000000000', '829fd0b4-7692-4360-9598-0df9def4ddb5', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-19 12:51:46.338828+00', ''),
	('00000000-0000-0000-0000-000000000000', '4f888657-6ba2-41dc-b7ff-2475335ff593', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-19 12:51:46.339617+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a8b117e1-6f83-4f39-856d-be7e6b0728f4', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-20 21:58:07.866739+00', ''),
	('00000000-0000-0000-0000-000000000000', '043d2ee5-4d73-494e-8fbc-f0b399210ce4', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-20 21:58:07.87581+00', ''),
	('00000000-0000-0000-0000-000000000000', '57d8c992-23c8-4be7-b452-83f3eedd7e13', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-20 22:56:37.253246+00', ''),
	('00000000-0000-0000-0000-000000000000', '8e868b03-505d-4d01-8ea6-d8db88bacb12', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-20 22:56:37.254717+00', ''),
	('00000000-0000-0000-0000-000000000000', '6d9dd9b7-7045-4cc5-8a25-a190b7e4e36e', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-20 23:54:47.319567+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f7b1ed7b-bf78-4d9e-be61-a3b199fe4937', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-20 23:54:47.321645+00', ''),
	('00000000-0000-0000-0000-000000000000', '803da007-7c2d-40e3-8d10-6d509e10a175', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-21 00:50:13.242345+00', ''),
	('00000000-0000-0000-0000-000000000000', '601a9172-bc04-4955-8e9c-65ba0e27aa02', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-21 15:04:24.886106+00', ''),
	('00000000-0000-0000-0000-000000000000', '6ec4b0c3-a2ec-4f7a-af54-54946b4e02a2', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-21 16:02:40.060147+00', ''),
	('00000000-0000-0000-0000-000000000000', '76288478-8385-4920-b6ac-d9505a0ffa47', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-21 16:02:40.060984+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dd9588cf-c1b2-4274-b0e5-d867d56f3783', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-21 17:00:41.275885+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd08e1a78-0192-4f4b-b64a-9e20ef8fc01c', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-21 17:00:41.276636+00', ''),
	('00000000-0000-0000-0000-000000000000', '2e3cdb21-d8f4-4cfb-8563-435d281a8dc1', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-21 17:58:51.580019+00', ''),
	('00000000-0000-0000-0000-000000000000', '85d6e3d2-6b5e-4388-a979-a94d209b3352', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-21 17:58:51.581507+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c4e683cf-ead6-4969-ab26-8d9b5c2694c8', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-21 19:07:58.122265+00', ''),
	('00000000-0000-0000-0000-000000000000', '7f5cda49-7ec2-4137-9d5e-b1e60c2f7f35', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-21 19:07:58.124431+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a164655e-8bcc-49e0-af7b-34c2e76b8b5c', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 06:49:16.637295+00', ''),
	('00000000-0000-0000-0000-000000000000', '4da4c5df-6543-4ade-9405-a47b26ae70b0', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 06:49:16.651543+00', ''),
	('00000000-0000-0000-0000-000000000000', '4f9315d3-49f8-4346-9d55-5aefca9b1c38', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 07:49:13.92123+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd4a4e45c-b056-4d41-9130-c7c41cbd2e85', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 07:49:13.922087+00', ''),
	('00000000-0000-0000-0000-000000000000', '53b51d2c-75b6-4ffd-8179-1d0d35a61365', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 08:47:18.648064+00', ''),
	('00000000-0000-0000-0000-000000000000', '7f33e2de-1c21-4ce7-93d1-f618fce77af7', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 08:47:18.649647+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ce16c5da-4b2a-4d37-8092-8d62ec9f940c', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 09:45:18.887699+00', ''),
	('00000000-0000-0000-0000-000000000000', '27a94bab-1ace-4a21-b425-476734766f45', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 09:45:18.888527+00', ''),
	('00000000-0000-0000-0000-000000000000', '2e2dfbc2-b053-40d3-a7c4-4cfe2e6f8607', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 10:43:19.079199+00', ''),
	('00000000-0000-0000-0000-000000000000', '9d3f7828-5d20-44aa-a537-4d10c549df1b', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 10:43:19.081246+00', ''),
	('00000000-0000-0000-0000-000000000000', 'eb867175-5588-472a-9224-2ceb4861c9f6', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 11:41:49.561873+00', ''),
	('00000000-0000-0000-0000-000000000000', '4a30c862-51db-44d4-9674-a379444de633', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 11:41:49.567288+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a67af371-defd-4040-8c6c-578802ed2557', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 12:40:19.695051+00', ''),
	('00000000-0000-0000-0000-000000000000', '5af920e2-9bc9-4ef5-9b67-277f2ab815d2', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 12:40:19.696487+00', ''),
	('00000000-0000-0000-0000-000000000000', '2ea31f82-51d9-4e3a-adce-7b339e607f70', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 13:38:20.041171+00', ''),
	('00000000-0000-0000-0000-000000000000', '8ee93a53-6d78-4c24-a39d-00f636a3f7a9', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 13:38:20.04353+00', ''),
	('00000000-0000-0000-0000-000000000000', '9e2ae6ac-0ecb-4723-9ea6-ec9ec24e6858', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 14:36:58.923292+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b30e2106-e489-48a7-82f0-f8b0a357f9fe', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 14:36:58.924817+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c66d49cb-2b35-4318-a99f-ae0de0ea2f6a', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 15:35:13.707045+00', ''),
	('00000000-0000-0000-0000-000000000000', '2065a59e-a048-4bb6-9541-f44ba4af5c07', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 15:35:13.70976+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd6d3e293-1beb-4acb-99ed-4d6b2f2d7c63', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 17:13:25.982249+00', ''),
	('00000000-0000-0000-0000-000000000000', '5507572e-3ce3-49c5-85dc-6b0cdd7d14de', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 17:13:25.98857+00', ''),
	('00000000-0000-0000-0000-000000000000', 'df854f35-cbc4-46f6-8caf-8fff65258134', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 20:19:04.262564+00', ''),
	('00000000-0000-0000-0000-000000000000', '749573c6-5859-4c57-995c-a295a50c8f02', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 20:19:04.265292+00', ''),
	('00000000-0000-0000-0000-000000000000', '86a06ff4-bfb0-42a7-8aca-5bee8497b36e', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-22 20:22:20.734006+00', ''),
	('00000000-0000-0000-0000-000000000000', '16e9bea5-d22d-485a-b0ae-805da6b1fb94', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-22 20:30:14.611223+00', ''),
	('00000000-0000-0000-0000-000000000000', '77ed7fbd-737d-44b3-ba2e-1265d45fc624', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 00:29:26.295113+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ce4a9547-b415-4f0f-90cf-40270b0d9a1e', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 00:29:26.300507+00', ''),
	('00000000-0000-0000-0000-000000000000', '26f0ffef-7150-4709-b4b2-2732277d3e61', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 02:31:21.191745+00', ''),
	('00000000-0000-0000-0000-000000000000', '5ac2a6de-7a0c-442b-be9c-e0dedad057b4', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 04:33:55.780839+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fe2ac656-8f9f-4b97-ab17-538ce8f84b77', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 04:33:55.782826+00', ''),
	('00000000-0000-0000-0000-000000000000', '1a06312e-3a8a-46af-bf62-bcb12b0074bf', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 04:34:51.850092+00', ''),
	('00000000-0000-0000-0000-000000000000', 'eb6d6719-672d-4ba6-b9b6-c89602c0ced6', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 05:34:26.54946+00', ''),
	('00000000-0000-0000-0000-000000000000', 'be49b8d9-2984-442c-9ea2-7f6654d4886b', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 06:45:36.38359+00', ''),
	('00000000-0000-0000-0000-000000000000', '58377948-d5c4-446c-959f-98fb380a1134', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 06:45:36.393607+00', ''),
	('00000000-0000-0000-0000-000000000000', '7e3a7bdd-3e8d-4206-aba1-bff5ddd7e61c', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 15:47:06.123987+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b3897cab-02be-47fc-9741-7d1d7f9a7825', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 15:47:06.12604+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ab476cd3-03ca-4f41-9894-1c08e4e305e3', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 16:45:10.279135+00', ''),
	('00000000-0000-0000-0000-000000000000', '6a97b61d-e6a5-493c-b093-9d2c73fa091b', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 16:45:10.280029+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cff217db-a68c-40a9-94ae-b0f71fca8cd5', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 17:43:34.276323+00', ''),
	('00000000-0000-0000-0000-000000000000', 'da5f6458-1592-4ec7-9763-fafb56fbe5ab', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 17:43:34.277768+00', ''),
	('00000000-0000-0000-0000-000000000000', '27e9efbe-2729-4fea-9926-427a2174cc2c', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 18:41:58.593022+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd1d35a98-bbce-44a3-81cd-db546afeb70c', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 18:41:58.595076+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a03f911e-4fcc-47cb-ba40-f87fb11094ac', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 19:40:04.345621+00', ''),
	('00000000-0000-0000-0000-000000000000', '1ca08440-0d4d-4d53-8d9e-25a836043204', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 19:40:04.347828+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c0d0dc1a-070e-4c88-8d05-d2bfc4db2f59', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 20:38:13.888176+00', ''),
	('00000000-0000-0000-0000-000000000000', '9aab9871-c349-4231-accb-8c98b13b6cb6', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 20:38:13.891021+00', ''),
	('00000000-0000-0000-0000-000000000000', 'db223093-fea5-417a-aba0-dd9f818c4a3d', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 23:43:40.858271+00', ''),
	('00000000-0000-0000-0000-000000000000', '3a0f85f2-0680-47f3-a698-42319153dedd', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 23:43:40.862359+00', ''),
	('00000000-0000-0000-0000-000000000000', '88274460-dbad-45a1-ba78-ef9a0c8ba5cd', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-23 23:43:40.886854+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c8d9d613-06d3-4e75-8d1b-206c875d3c2e', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 00:45:42.723817+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dcd87598-830a-46a2-ba0f-214fb416f42a', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 00:45:42.726465+00', ''),
	('00000000-0000-0000-0000-000000000000', '4c5dd213-e715-4ff7-ab70-5315828f026d', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 00:45:42.749949+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f44b0c13-24f8-4dcc-84ca-a74354c8984a', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 01:47:08.377302+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a9d2ee5c-0995-4ef5-b27d-eb48b32096cd', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 01:47:08.379889+00', ''),
	('00000000-0000-0000-0000-000000000000', '2e9f26b1-492f-43f6-901e-a7d5447cef50', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 01:47:08.399212+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c7c1bde9-9062-4aab-a3f7-f5980e15d306', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 02:45:42.402205+00', ''),
	('00000000-0000-0000-0000-000000000000', '80c941e8-de37-4b60-8b16-67798bcec500', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 02:45:42.404526+00', ''),
	('00000000-0000-0000-0000-000000000000', '836aa910-cb00-4951-bd0a-ee306266b9ab', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 02:45:42.432295+00', ''),
	('00000000-0000-0000-0000-000000000000', '34eb0fb2-6e0e-426b-9880-a8965d56b4ce', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 03:44:14.117787+00', ''),
	('00000000-0000-0000-0000-000000000000', 'eef9abe2-9886-4317-a5be-1b6df4b37d03', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 03:44:14.120518+00', ''),
	('00000000-0000-0000-0000-000000000000', '7b53b062-5ca3-4221-823b-aaf2d74dfc79', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 03:44:14.151053+00', ''),
	('00000000-0000-0000-0000-000000000000', '276a325c-0e74-47fa-a3b4-d1f9bea1a9e3', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 05:10:37.715749+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c7f7fd7b-e905-4b34-a119-6075cc44a42b', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 05:10:37.717872+00', ''),
	('00000000-0000-0000-0000-000000000000', '03dde81f-ad99-4193-9e1a-bb98d9e6a4c0', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 05:10:37.738711+00', ''),
	('00000000-0000-0000-0000-000000000000', '14f3496e-d8fd-47ec-adc4-1c1a35140dfc', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 07:17:04.449354+00', ''),
	('00000000-0000-0000-0000-000000000000', '90d70851-c2be-42f1-8c32-0931a051a36e', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 07:17:04.453409+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b4cd148f-4091-4037-8eee-fa5647ca6f7a', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 07:17:04.476249+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bd6b03d5-d753-4ece-8952-71c52277a350', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 08:15:24.867743+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f5332f93-bca3-403d-8c70-37c974cae149', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 08:15:24.875626+00', ''),
	('00000000-0000-0000-0000-000000000000', 'da0cd99a-6a5e-474d-9099-20f5d2483bd9', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 08:15:24.916707+00', ''),
	('00000000-0000-0000-0000-000000000000', '00902c84-a144-4496-9f9f-d16a7167b853', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 09:13:25.457731+00', ''),
	('00000000-0000-0000-0000-000000000000', '25bfe729-aa2c-48e3-8a6f-eeeff6f7abf3', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 09:13:25.460513+00', ''),
	('00000000-0000-0000-0000-000000000000', '216670f5-5241-48d2-ba9f-4c724578aecc', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 09:13:25.484386+00', ''),
	('00000000-0000-0000-0000-000000000000', '8c5644e7-c356-4361-989f-64d80f9057c6', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 10:11:55.592239+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e7430729-638e-4f67-a6ca-0c312c3ba91f', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 10:11:55.596051+00', ''),
	('00000000-0000-0000-0000-000000000000', '9b6ae807-9836-4485-b278-64d6255b156c', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 10:11:55.63157+00', ''),
	('00000000-0000-0000-0000-000000000000', '4ec49cb6-01c0-44ef-8d86-efba7533da41', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 11:09:55.820571+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fc139eee-1867-4ca1-b9f2-f05f66afc104', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 11:09:55.822135+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bfbcb7c5-46de-4558-88d0-56411e8012e2', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 11:09:55.855324+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a43da01f-7a60-4999-82f1-1c7f1f78b7ad', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 15:04:35.874944+00', ''),
	('00000000-0000-0000-0000-000000000000', '9891887c-6b57-4000-bcd3-546008247b52', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 15:04:35.87873+00', ''),
	('00000000-0000-0000-0000-000000000000', '739e7df3-7168-44a0-8ba9-1ec212789f2e', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 16:02:40.171069+00', ''),
	('00000000-0000-0000-0000-000000000000', '963d6872-d8d7-4fe1-84a7-588fda9cb87d', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 16:02:40.172596+00', ''),
	('00000000-0000-0000-0000-000000000000', '19fa3e6f-2bbc-4c6c-adcb-529e3fef160f', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 17:01:48.45855+00', ''),
	('00000000-0000-0000-0000-000000000000', '3db3375f-5fa3-4cb5-a365-faef2a7ea513', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 17:01:48.46093+00', ''),
	('00000000-0000-0000-0000-000000000000', '4e789c90-dedf-44f9-b0d4-6484d6baea68', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 18:00:09.950932+00', ''),
	('00000000-0000-0000-0000-000000000000', '7ceff237-4b4b-42ca-9c22-7aa94c551018', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 18:00:09.953254+00', ''),
	('00000000-0000-0000-0000-000000000000', '5081c0f6-89e6-4f44-91fe-0dfed9b5fc2b', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 18:58:11.271558+00', ''),
	('00000000-0000-0000-0000-000000000000', '8b19cc4b-ece4-418d-b8fb-03a90a879d0e', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 18:58:11.276805+00', ''),
	('00000000-0000-0000-0000-000000000000', '3252df11-b992-4266-a222-6793870172b4', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 20:00:07.620132+00', ''),
	('00000000-0000-0000-0000-000000000000', '40357494-7a11-4795-bda4-f7b70df59c2c', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 20:00:07.622949+00', ''),
	('00000000-0000-0000-0000-000000000000', '2fee4501-770a-46cc-bc40-3b36171b752a', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 20:58:14.88097+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f232aafd-5a1a-42bd-b867-acc3b2d88a9d', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-24 20:58:14.881755+00', ''),
	('00000000-0000-0000-0000-000000000000', '55c8180a-819b-4d57-81c5-7140357c0b77', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-24 21:47:35.232364+00', ''),
	('00000000-0000-0000-0000-000000000000', '21c02add-3461-42c2-9aaf-9e7781da8ec6', '{"action":"logout","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account"}', '2025-07-24 22:10:50.722735+00', ''),
	('00000000-0000-0000-0000-000000000000', '8bc9e053-00df-40c8-ac78-3bcda019644a', '{"action":"user_signedup","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-07-24 22:20:48.613392+00', ''),
	('00000000-0000-0000-0000-000000000000', '288b2658-7796-4cfe-b950-9017202376de', '{"action":"login","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-24 22:20:48.623321+00', ''),
	('00000000-0000-0000-0000-000000000000', '627a718e-36fb-41a9-b351-369c9a9dc3d6', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 12:07:47.062641+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b5772f67-2286-4c7b-9861-8af9ac761dd7', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"aisha.patel@safepath.test","user_id":"6cb20cc1-1bf2-41c5-bdba-c5ce76ef4859","user_phone":""}}', '2025-07-24 22:33:01.439272+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e690864a-3627-4505-9fbd-b695f820b54b', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"marcus.washington@safepath.test","user_id":"fa1cb7a2-3b20-4d6d-9643-8a4477735275","user_phone":""}}', '2025-07-24 22:33:29.424892+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b57bbbb2-e401-47ef-845a-5a95630e2b0e', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"emma.chen@safepath.test","user_id":"2713d912-0fa8-4905-b0ec-6699f6946e89","user_phone":""}}', '2025-07-24 22:33:51.655571+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ed95f473-a5ef-47a8-9fb5-796bea9a9491', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"david.kim@safepath.test","user_id":"d6e0b882-d8d6-4443-b5c3-1e18eab1a7a1","user_phone":""}}', '2025-07-24 22:34:17.472375+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b07f1321-e2f5-4724-8f2a-e74bd2ffd4df', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"sofia.gonzalez@safepath.test","user_id":"43ad6c42-21fa-4e47-ac55-0c8004706f9a","user_phone":""}}', '2025-07-24 22:34:38.637905+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ae6ac22e-6fef-4bcd-898f-ad38a818c5af', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"alex.thompson@safepath.test","user_id":"bff9a0b4-c4bf-44af-b946-0925a7813778","user_phone":""}}', '2025-07-24 22:34:52.705805+00', ''),
	('00000000-0000-0000-0000-000000000000', '0b2d0570-9e97-423a-a5dc-1a5189bd1bf2', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"fatima.alrashid@safepath.test","user_id":"fd5aa6d0-3b0b-4eb1-bd79-16282ececb7d","user_phone":""}}', '2025-07-24 22:35:10.751902+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd5c1b101-b10f-41ff-a5a4-6aa2d3f390d7', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-24 23:19:12.355334+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ea1c2c9b-0ee7-49b7-bcd5-d9744d6f4579', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-24 23:19:12.35675+00', ''),
	('00000000-0000-0000-0000-000000000000', '71821c38-7319-4228-940d-b59a8ecf3796', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 00:17:16.693684+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c6d6a5b7-178b-4ddd-8c8d-8d70a95429ab', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 00:17:16.698261+00', ''),
	('00000000-0000-0000-0000-000000000000', '30765c0d-867d-4cb1-994e-a5f32a4f4c9a', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 01:15:38.184484+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd5184b74-b985-4966-93cf-cd1dcb0b012a', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 01:15:38.187699+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f65db03a-7f62-4738-a08f-55ac89ad340a', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 02:26:26.042015+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ecd0598b-0500-48e3-adf1-653478f71499', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 02:26:26.044668+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f824cb92-9969-46ba-8969-3ac06cd60c98', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 03:24:56.329907+00', ''),
	('00000000-0000-0000-0000-000000000000', '532c2635-d969-4f72-a134-060717928f45', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 03:24:56.337894+00', ''),
	('00000000-0000-0000-0000-000000000000', '25b48ee3-101e-433f-abc0-36c657fb1811', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 04:23:05.941452+00', ''),
	('00000000-0000-0000-0000-000000000000', '871adc07-9e32-4656-ae74-e913ce0aa2dd', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 04:23:05.944067+00', ''),
	('00000000-0000-0000-0000-000000000000', '2dfb56ca-6274-4308-8106-65fdcd558145', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 05:25:31.622698+00', ''),
	('00000000-0000-0000-0000-000000000000', '0810e635-a4ac-4a80-9974-f3a9d1681ee4', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 05:25:31.625318+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bdf7cb69-17da-4692-aa41-0743426ed1d0', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 06:29:49.229793+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c25e16b7-4320-4485-a63e-dd4cf33bda2e', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 06:29:49.232935+00', ''),
	('00000000-0000-0000-0000-000000000000', '5353367b-0056-49e1-bdf5-ca8d6c651115', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 07:27:49.494032+00', ''),
	('00000000-0000-0000-0000-000000000000', '7bf600dd-8ab6-425f-9b67-2c4c42223460', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 07:27:49.496658+00', ''),
	('00000000-0000-0000-0000-000000000000', '4db230f2-b964-4b28-917d-a9ad6cfcb8a0', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 10:11:16.94375+00', ''),
	('00000000-0000-0000-0000-000000000000', '4b6569af-beb9-4b22-a553-cafa2eac3ebf', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 10:11:16.948798+00', ''),
	('00000000-0000-0000-0000-000000000000', '28263557-fec0-4ea0-9ec4-940ff0d9c794', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 11:09:46.726075+00', ''),
	('00000000-0000-0000-0000-000000000000', '90cab5c9-2b70-4387-ae32-65a81797859e', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 11:09:46.728842+00', ''),
	('00000000-0000-0000-0000-000000000000', '3cfeb71b-34de-4004-be34-51ce8f1ec5d5', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 12:07:47.067293+00', ''),
	('00000000-0000-0000-0000-000000000000', '6adc4ffa-0bca-4ae2-99e0-26f37205732c', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 13:06:17.201146+00', ''),
	('00000000-0000-0000-0000-000000000000', '39f32400-9bf0-457b-8204-315bdc3679a8', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 13:06:17.204861+00', ''),
	('00000000-0000-0000-0000-000000000000', '65149ab4-2394-4f70-8000-d402aa95e9d6', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 14:04:47.7432+00', ''),
	('00000000-0000-0000-0000-000000000000', '1498db4e-f07f-4c07-9b0a-82c0e6cc78ea', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 14:04:47.744066+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ab7eb44d-d8be-4e4e-8e96-b290196e8dc4', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 15:02:47.874456+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f04b5990-80d2-46da-846f-cb23bd8573c2', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 15:02:47.878488+00', ''),
	('00000000-0000-0000-0000-000000000000', '448b4002-02e6-49db-9149-69d7a7398bcc', '{"action":"token_refreshed","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 16:46:00.652415+00', ''),
	('00000000-0000-0000-0000-000000000000', '7480440e-b032-4f6d-bbf2-4ffb3748c4d0', '{"action":"token_revoked","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-25 16:46:00.655081+00', ''),
	('00000000-0000-0000-0000-000000000000', '79d011bd-1278-4df7-9c86-ecc78416fb9a', '{"action":"logout","actor_id":"27c819f4-742a-40e5-83f4-a86d9f2b25dd","actor_username":"controlyourdrinking@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-07-25 17:02:58.729885+00', ''),
	('00000000-0000-0000-0000-000000000000', '6ad3543f-fa49-47ab-b2cc-a7e517a199b4', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 08:47:40.886844+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e0350c79-dbd3-4910-83ee-399c67997d9b', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 08:47:47.007826+00', ''),
	('00000000-0000-0000-0000-000000000000', '27857b53-837c-4c2f-8a83-314d916c2476', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 08:48:17.804514+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b3d23649-7fc4-4c5e-b400-0d1d812030d2', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 08:50:48.78442+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a226daa6-8af5-427e-97d3-9440a34755f4', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 09:12:59.907902+00', ''),
	('00000000-0000-0000-0000-000000000000', '65b4357c-89bc-4a16-8963-ad6a61306f9a', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 09:15:36.31465+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e4a4bdea-a72e-47e8-91f5-ca65a5037801', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 09:27:39.30302+00', ''),
	('00000000-0000-0000-0000-000000000000', '1c389944-32c2-4c15-863d-6290ee79c449', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 09:31:44.19381+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e225ad2d-cef2-43ab-9e7a-b11b4feb9a3b', '{"action":"logout","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account"}', '2025-07-26 09:33:53.732256+00', ''),
	('00000000-0000-0000-0000-000000000000', '5b7e63b1-9a4d-46a5-b55e-2e6d4c9a73ca', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 09:34:07.133535+00', ''),
	('00000000-0000-0000-0000-000000000000', '01a25376-45a8-405a-b6a9-ab2d988d453d', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 09:36:49.941202+00', ''),
	('00000000-0000-0000-0000-000000000000', 'af064273-98e1-4896-968e-fed5a8cbf8b6', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-26 11:26:20.488727+00', ''),
	('00000000-0000-0000-0000-000000000000', '72c23103-8c1b-4583-a243-acd09012310e', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-26 11:26:20.493916+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e3776be1-71a8-4d9c-a109-707d3df9e0c5', '{"action":"logout","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account"}', '2025-07-26 11:31:36.884823+00', ''),
	('00000000-0000-0000-0000-000000000000', '102c2aaf-5e09-4484-9cc5-cb9d8c7c6da9', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 11:40:41.217522+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a4d7acfb-e296-49d5-a8d2-60197074a410', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 11:56:13.458894+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a20cd661-3c03-4ed8-9a2b-318c43b6c50d', '{"action":"logout","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account"}', '2025-07-26 11:57:49.308462+00', ''),
	('00000000-0000-0000-0000-000000000000', '4ee80d0c-e4b6-4007-bae7-146832464222', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 11:58:04.12153+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dfcfbe31-ccdb-4f19-a766-2bdc7f1a8d97', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 11:59:23.755866+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd3e96801-62b7-4488-be05-0d55da8e4a3d', '{"action":"logout","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account"}', '2025-07-26 12:12:48.013382+00', ''),
	('00000000-0000-0000-0000-000000000000', '23d1f087-3df8-493e-9191-a5ab5b9a8f25', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 12:12:59.871956+00', ''),
	('00000000-0000-0000-0000-000000000000', '0f97c864-155d-4bff-8fc3-1ce30b299b2d', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 12:18:53.455714+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dede23d5-5eb6-4ae5-a9f2-7f8daccd99c7', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 12:25:44.697721+00', ''),
	('00000000-0000-0000-0000-000000000000', '4bd499c8-f0c5-4198-9bb3-4b9fc9c7d2ce', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 12:29:20.286657+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd46bc25e-f19b-47a0-8a0c-95ffbed234a0', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 12:30:40.847573+00', ''),
	('00000000-0000-0000-0000-000000000000', '0dacc838-9b62-44c8-ab42-62b24665b8b7', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 12:32:29.774993+00', ''),
	('00000000-0000-0000-0000-000000000000', 'abbda84d-f070-4d44-a177-f0178c6f3ce2', '{"action":"login","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-26 12:53:26.282752+00', ''),
	('00000000-0000-0000-0000-000000000000', '4b888855-e7a2-4392-9631-a072f4808a19', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-26 13:51:29.128336+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b85377a6-f91c-455f-a074-330e131e195b', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-26 13:51:29.129289+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd503388d-fd00-4ce8-b05f-9e23407671cd', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-26 14:50:00.0029+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b3fa6bcd-ca67-42a5-b428-71cd2612fbe3', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-26 14:50:00.003841+00', ''),
	('00000000-0000-0000-0000-000000000000', '6558ea66-354c-4dc1-833b-d03fcf4d8e5b', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-26 15:48:29.858913+00', ''),
	('00000000-0000-0000-0000-000000000000', '94a74702-8e67-475b-af1f-f7adfba7a6b1', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-26 15:48:29.85974+00', ''),
	('00000000-0000-0000-0000-000000000000', '6cacc033-edc0-46a8-8236-56d5d30f4564', '{"action":"token_refreshed","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-26 16:48:20.108789+00', ''),
	('00000000-0000-0000-0000-000000000000', '7d3463f6-1481-4c6c-b6eb-01c70aac22f7', '{"action":"token_revoked","actor_id":"afcc06cb-fcd0-450a-a573-380eb4ab7581","actor_username":"daniel@danielg.online","actor_via_sso":false,"log_type":"token"}', '2025-07-26 16:48:20.11268+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '2713d912-0fa8-4905-b0ec-6699f6946e89', 'authenticated', 'authenticated', 'emma.chen@safepath.test', '$2a$10$2qDOkF.zcNGjhj4Xyz2Ux.CfjoT7Q8j9N8sW5EFqNLApMEzTtIKwO', '2025-07-24 22:33:51.661175+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-07-24 22:33:51.652292+00', '2025-07-24 22:33:51.661897+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '572aa506-5d2c-4a28-9e7c-a5b4be39a033', 'authenticated', 'authenticated', 'daniel@daniel-gasser.com', '$2a$10$SZQzdRv/BtlscoF1vjtkFOZTOT3y851Hmf406/Npx3oENM8DAdkze', '2025-07-18 20:10:41.874206+00', NULL, '', '2025-07-18 18:30:12.531072+00', '', '2025-07-18 20:09:01.011168+00', '', '', NULL, '2025-07-18 20:10:41.879153+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "572aa506-5d2c-4a28-9e7c-a5b4be39a033", "email": "daniel@daniel-gasser.com", "email_verified": true, "phone_verified": false}', NULL, '2025-07-18 18:30:12.482354+00', '2025-07-18 20:10:41.89452+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', 'authenticated', 'authenticated', 'daniel@danielg.online', '$2a$10$pyzvdiZlgMYWoP5ID57zaO5GZyDuarsb/TdYddlplL5VzRsFJj62u', '2025-07-18 20:18:04.803555+00', NULL, '', '2025-07-18 20:16:42.450871+00', '', NULL, '', '', NULL, '2025-07-26 12:53:26.284324+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "afcc06cb-fcd0-450a-a573-380eb4ab7581", "email": "daniel@danielg.online", "email_verified": true, "phone_verified": false}', NULL, '2025-07-18 20:16:42.437148+00', '2025-07-26 16:48:20.116269+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'd6e0b882-d8d6-4443-b5c3-1e18eab1a7a1', 'authenticated', 'authenticated', 'david.kim@safepath.test', '$2a$10$2DBAeT4s95O.vNyWll1JWuIPdRR1gMfHaDj/rJ7aH0/M4MrpdaHSO', '2025-07-24 22:34:17.473338+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-07-24 22:34:17.470446+00', '2025-07-24 22:34:17.473983+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '6cb20cc1-1bf2-41c5-bdba-c5ce76ef4859', 'authenticated', 'authenticated', 'aisha.patel@safepath.test', '$2a$10$rrZ6WK3SFbkFvQdTUk3p0OT8kqEXeeVFZcYQ6GlwBxwmIpwHiutBm', '2025-07-24 22:33:01.442261+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-07-24 22:33:01.430417+00', '2025-07-24 22:33:01.443118+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '88bb1b77-a84e-4c13-a787-0ff4b797376d', 'authenticated', 'authenticated', 'software@daniel-gasser.com', '$2a$10$YGzw6mj5Sbon4yPyyBOPd.L/2rzmwvfTohagzM.yxpEFwEDePkqDa', '2025-07-18 20:20:51.24827+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-07-18 20:20:51.252549+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "88bb1b77-a84e-4c13-a787-0ff4b797376d", "email": "software@daniel-gasser.com", "email_verified": true, "phone_verified": false}', NULL, '2025-07-18 20:20:51.238351+00', '2025-07-18 21:19:03.574687+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'fd5aa6d0-3b0b-4eb1-bd79-16282ececb7d', 'authenticated', 'authenticated', 'fatima.alrashid@safepath.test', '$2a$10$6HxQJAHQyFgyMXIUHbYpo.KPI9DOXo8tSPWGdgBNXcbcaalSXiSEy', '2025-07-24 22:35:10.752938+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-07-24 22:35:10.749791+00', '2025-07-24 22:35:10.753663+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '43ad6c42-21fa-4e47-ac55-0c8004706f9a', 'authenticated', 'authenticated', 'sofia.gonzalez@safepath.test', '$2a$10$/cYR6LfkgA/.slqF4lo/mORGhP1Cp3SI1LuxgvK8lxIzPihngu2DC', '2025-07-24 22:34:38.639511+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-07-24 22:34:38.634768+00', '2025-07-24 22:34:38.640184+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'fa1cb7a2-3b20-4d6d-9643-8a4477735275', 'authenticated', 'authenticated', 'marcus.washington@safepath.test', '$2a$10$1FSarUwXsZe5Q5ndxwxYV.A/DIRK2Dv3zYynzyRgWcHEhlUKi8Dt.', '2025-07-24 22:33:29.426512+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-07-24 22:33:29.420398+00', '2025-07-24 22:33:29.427183+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '27c819f4-742a-40e5-83f4-a86d9f2b25dd', 'authenticated', 'authenticated', 'controlyourdrinking@gmail.com', '$2a$10$8tvPGhxMuSVjlzoJQTill.QDY8UhoM69yZad9LidZLS1XjU9ZoRtS', '2025-07-24 22:20:48.614736+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-07-24 22:20:48.623887+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "27c819f4-742a-40e5-83f4-a86d9f2b25dd", "email": "controlyourdrinking@gmail.com", "email_verified": true, "phone_verified": false}', NULL, '2025-07-24 22:20:48.580565+00', '2025-07-25 16:46:00.658646+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'bff9a0b4-c4bf-44af-b946-0925a7813778', 'authenticated', 'authenticated', 'alex.thompson@safepath.test', '$2a$10$hwq4wQbY0MIgKDE55SgYqeucStqOEOGzzhN3t3R0eAha.1/eIs1gS', '2025-07-24 22:34:52.706823+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-07-24 22:34:52.702506+00', '2025-07-24 22:34:52.707467+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('572aa506-5d2c-4a28-9e7c-a5b4be39a033', '572aa506-5d2c-4a28-9e7c-a5b4be39a033', '{"sub": "572aa506-5d2c-4a28-9e7c-a5b4be39a033", "email": "daniel@daniel-gasser.com", "email_verified": false, "phone_verified": false}', 'email', '2025-07-18 18:30:12.522677+00', '2025-07-18 18:30:12.522731+00', '2025-07-18 18:30:12.522731+00', '14b77f42-90cc-43a2-9885-f6bc8f91d7c8'),
	('afcc06cb-fcd0-450a-a573-380eb4ab7581', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '{"sub": "afcc06cb-fcd0-450a-a573-380eb4ab7581", "email": "daniel@danielg.online", "email_verified": true, "phone_verified": false}', 'email', '2025-07-18 20:16:42.447784+00', '2025-07-18 20:16:42.447897+00', '2025-07-18 20:16:42.447897+00', 'bde78866-5d23-4e60-aed2-e3c592dec760'),
	('88bb1b77-a84e-4c13-a787-0ff4b797376d', '88bb1b77-a84e-4c13-a787-0ff4b797376d', '{"sub": "88bb1b77-a84e-4c13-a787-0ff4b797376d", "email": "software@daniel-gasser.com", "email_verified": false, "phone_verified": false}', 'email', '2025-07-18 20:20:51.244941+00', '2025-07-18 20:20:51.244997+00', '2025-07-18 20:20:51.244997+00', 'd5baa253-cec6-4990-9b72-7d9688e0d144'),
	('27c819f4-742a-40e5-83f4-a86d9f2b25dd', '27c819f4-742a-40e5-83f4-a86d9f2b25dd', '{"sub": "27c819f4-742a-40e5-83f4-a86d9f2b25dd", "email": "controlyourdrinking@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2025-07-24 22:20:48.610812+00', '2025-07-24 22:20:48.610863+00', '2025-07-24 22:20:48.610863+00', '69ebbbba-4002-4d8e-b724-e75a789de835'),
	('6cb20cc1-1bf2-41c5-bdba-c5ce76ef4859', '6cb20cc1-1bf2-41c5-bdba-c5ce76ef4859', '{"sub": "6cb20cc1-1bf2-41c5-bdba-c5ce76ef4859", "email": "aisha.patel@safepath.test", "email_verified": false, "phone_verified": false}', 'email', '2025-07-24 22:33:01.438351+00', '2025-07-24 22:33:01.438421+00', '2025-07-24 22:33:01.438421+00', 'e0ac6a5d-418d-41f6-9060-750cccf596f4'),
	('fa1cb7a2-3b20-4d6d-9643-8a4477735275', 'fa1cb7a2-3b20-4d6d-9643-8a4477735275', '{"sub": "fa1cb7a2-3b20-4d6d-9643-8a4477735275", "email": "marcus.washington@safepath.test", "email_verified": false, "phone_verified": false}', 'email', '2025-07-24 22:33:29.423602+00', '2025-07-24 22:33:29.423654+00', '2025-07-24 22:33:29.423654+00', '9ebc0516-dec9-416b-826e-778229f039c2'),
	('2713d912-0fa8-4905-b0ec-6699f6946e89', '2713d912-0fa8-4905-b0ec-6699f6946e89', '{"sub": "2713d912-0fa8-4905-b0ec-6699f6946e89", "email": "emma.chen@safepath.test", "email_verified": false, "phone_verified": false}', 'email', '2025-07-24 22:33:51.654884+00', '2025-07-24 22:33:51.654931+00', '2025-07-24 22:33:51.654931+00', '23ee905d-bcee-4aa5-87f4-cff67d379ebf'),
	('d6e0b882-d8d6-4443-b5c3-1e18eab1a7a1', 'd6e0b882-d8d6-4443-b5c3-1e18eab1a7a1', '{"sub": "d6e0b882-d8d6-4443-b5c3-1e18eab1a7a1", "email": "david.kim@safepath.test", "email_verified": false, "phone_verified": false}', 'email', '2025-07-24 22:34:17.471668+00', '2025-07-24 22:34:17.471719+00', '2025-07-24 22:34:17.471719+00', 'e17fefad-f5e7-40bf-abee-3186ff0af80c'),
	('43ad6c42-21fa-4e47-ac55-0c8004706f9a', '43ad6c42-21fa-4e47-ac55-0c8004706f9a', '{"sub": "43ad6c42-21fa-4e47-ac55-0c8004706f9a", "email": "sofia.gonzalez@safepath.test", "email_verified": false, "phone_verified": false}', 'email', '2025-07-24 22:34:38.63716+00', '2025-07-24 22:34:38.637221+00', '2025-07-24 22:34:38.637221+00', '9f4bd747-7d79-4d2c-8bc5-2bb50ddd360a'),
	('bff9a0b4-c4bf-44af-b946-0925a7813778', 'bff9a0b4-c4bf-44af-b946-0925a7813778', '{"sub": "bff9a0b4-c4bf-44af-b946-0925a7813778", "email": "alex.thompson@safepath.test", "email_verified": false, "phone_verified": false}', 'email', '2025-07-24 22:34:52.705114+00', '2025-07-24 22:34:52.705165+00', '2025-07-24 22:34:52.705165+00', '6b612e20-3572-492a-b676-ad15b7188972'),
	('fd5aa6d0-3b0b-4eb1-bd79-16282ececb7d', 'fd5aa6d0-3b0b-4eb1-bd79-16282ececb7d', '{"sub": "fd5aa6d0-3b0b-4eb1-bd79-16282ececb7d", "email": "fatima.alrashid@safepath.test", "email_verified": false, "phone_verified": false}', 'email', '2025-07-24 22:35:10.751144+00', '2025-07-24 22:35:10.751203+00', '2025-07-24 22:35:10.751203+00', 'afd4424e-87b7-4f42-850c-3faecd73931f');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag") VALUES
	('0120637c-e037-4467-ab7b-bef8629ab323', '572aa506-5d2c-4a28-9e7c-a5b4be39a033', '2025-07-18 20:10:41.879855+00', '2025-07-18 20:10:41.879855+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36', '94.156.228.134', NULL),
	('5fda5f25-5e9f-4c33-a581-8c35dc1e17be', '88bb1b77-a84e-4c13-a787-0ff4b797376d', '2025-07-18 20:20:51.252622+00', '2025-07-18 21:19:03.576537+00', NULL, 'aal1', NULL, '2025-07-18 21:19:03.576468', 'Expo/2.33.13 CFNetwork/3826.500.131 Darwin/24.5.0', '94.156.228.134', NULL),
	('c3f5dded-5114-42d7-abc2-2d780ec90e90', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '2025-07-26 12:12:59.8727+00', '2025-07-26 12:12:59.8727+00', NULL, 'aal1', NULL, NULL, 'Expo/2.33.13 CFNetwork/3826.500.131 Darwin/24.5.0', '94.156.228.134', NULL),
	('9314f659-e619-4f8e-9b7c-622fb526b6f4', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '2025-07-26 12:18:53.458116+00', '2025-07-26 12:18:53.458116+00', NULL, 'aal1', NULL, NULL, 'Expo/2.33.13 CFNetwork/3826.500.131 Darwin/24.5.0', '94.156.228.134', NULL),
	('066842e7-54a4-40cf-8218-f8018464e5d6', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '2025-07-26 12:25:44.699394+00', '2025-07-26 12:25:44.699394+00', NULL, 'aal1', NULL, NULL, 'Expo/2.33.13 CFNetwork/3826.500.131 Darwin/24.5.0', '94.156.228.134', NULL),
	('d303e084-1efc-4954-b196-ee012152ca00', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '2025-07-26 12:29:20.288384+00', '2025-07-26 12:29:20.288384+00', NULL, 'aal1', NULL, NULL, 'Expo/2.33.13 CFNetwork/3826.500.131 Darwin/24.5.0', '94.156.228.134', NULL),
	('56ec2cc9-8236-4322-9cb1-adddc555f62f', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '2025-07-26 12:30:40.848643+00', '2025-07-26 12:30:40.848643+00', NULL, 'aal1', NULL, NULL, 'Expo/2.33.13 CFNetwork/3826.500.131 Darwin/24.5.0', '94.156.228.134', NULL),
	('a28bc6dd-61e0-43d7-91cd-4eaaa0549196', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '2025-07-26 12:32:29.776007+00', '2025-07-26 12:32:29.776007+00', NULL, 'aal1', NULL, NULL, 'Expo/2.33.13 CFNetwork/3826.500.131 Darwin/24.5.0', '94.156.228.134', NULL),
	('1b074ec5-aeb2-4a4d-8cd2-b78c3beeba37', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '2025-07-26 12:53:26.284392+00', '2025-07-26 16:48:20.118133+00', NULL, 'aal1', NULL, '2025-07-26 16:48:20.118063', 'Expo/2.33.13 CFNetwork/3826.500.131 Darwin/24.5.0', '94.156.228.134', NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('0120637c-e037-4467-ab7b-bef8629ab323', '2025-07-18 20:10:41.895009+00', '2025-07-18 20:10:41.895009+00', 'otp', '0df68a43-22fa-4b90-88e7-7538f1f015b2'),
	('5fda5f25-5e9f-4c33-a581-8c35dc1e17be', '2025-07-18 20:20:51.255293+00', '2025-07-18 20:20:51.255293+00', 'password', '5e223ad3-1084-4206-9038-3f5b2947821a'),
	('c3f5dded-5114-42d7-abc2-2d780ec90e90', '2025-07-26 12:12:59.876635+00', '2025-07-26 12:12:59.876635+00', 'password', 'fa85aeb6-bf0b-4f3b-a90c-51f4b609734f'),
	('9314f659-e619-4f8e-9b7c-622fb526b6f4', '2025-07-26 12:18:53.463172+00', '2025-07-26 12:18:53.463172+00', 'password', '37c6e959-6ce2-45bc-b7df-b87543f4418a'),
	('066842e7-54a4-40cf-8218-f8018464e5d6', '2025-07-26 12:25:44.704695+00', '2025-07-26 12:25:44.704695+00', 'password', 'ee8ba173-173d-464c-8595-f4027b0d1fa8'),
	('d303e084-1efc-4954-b196-ee012152ca00', '2025-07-26 12:29:20.294342+00', '2025-07-26 12:29:20.294342+00', 'password', '2b3f2425-d55e-4e08-8e5b-25db9cce956e'),
	('56ec2cc9-8236-4322-9cb1-adddc555f62f', '2025-07-26 12:30:40.852231+00', '2025-07-26 12:30:40.852231+00', 'password', '278a39b4-52f3-44f8-b229-6548ca144ef1'),
	('a28bc6dd-61e0-43d7-91cd-4eaaa0549196', '2025-07-26 12:32:29.779014+00', '2025-07-26 12:32:29.779014+00', 'password', '943b0854-4a01-4d0c-8d03-ac829ca858d9'),
	('1b074ec5-aeb2-4a4d-8cd2-b78c3beeba37', '2025-07-26 12:53:26.289335+00', '2025-07-26 12:53:26.289335+00', 'password', 'b819b80e-47f3-49d3-adb1-8d3d3aada574');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 1, 'sak67z2xg27p', '572aa506-5d2c-4a28-9e7c-a5b4be39a033', false, '2025-07-18 20:10:41.884337+00', '2025-07-18 20:10:41.884337+00', NULL, '0120637c-e037-4467-ab7b-bef8629ab323'),
	('00000000-0000-0000-0000-000000000000', 100, 'qofqkw6whntn', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', true, '2025-07-26 15:48:29.860891+00', '2025-07-26 16:48:20.11326+00', 'dfx7t7zbixu4', '1b074ec5-aeb2-4a4d-8cd2-b78c3beeba37'),
	('00000000-0000-0000-0000-000000000000', 101, 'eb7xhbr4zhud', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', false, '2025-07-26 16:48:20.114587+00', '2025-07-26 16:48:20.114587+00', 'qofqkw6whntn', '1b074ec5-aeb2-4a4d-8cd2-b78c3beeba37'),
	('00000000-0000-0000-0000-000000000000', 3, 'd6jmcfpq4soh', '88bb1b77-a84e-4c13-a787-0ff4b797376d', true, '2025-07-18 20:20:51.253592+00', '2025-07-18 21:19:03.570885+00', NULL, '5fda5f25-5e9f-4c33-a581-8c35dc1e17be'),
	('00000000-0000-0000-0000-000000000000', 4, 'wbc6azouxadv', '88bb1b77-a84e-4c13-a787-0ff4b797376d', false, '2025-07-18 21:19:03.573639+00', '2025-07-18 21:19:03.573639+00', 'd6jmcfpq4soh', '5fda5f25-5e9f-4c33-a581-8c35dc1e17be'),
	('00000000-0000-0000-0000-000000000000', 91, 'lj22v7xy2cpr', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', false, '2025-07-26 12:12:59.874232+00', '2025-07-26 12:12:59.874232+00', NULL, 'c3f5dded-5114-42d7-abc2-2d780ec90e90'),
	('00000000-0000-0000-0000-000000000000', 92, 's3ikbxoznytr', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', false, '2025-07-26 12:18:53.460545+00', '2025-07-26 12:18:53.460545+00', NULL, '9314f659-e619-4f8e-9b7c-622fb526b6f4'),
	('00000000-0000-0000-0000-000000000000', 93, 'lrsb6od6shir', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', false, '2025-07-26 12:25:44.70126+00', '2025-07-26 12:25:44.70126+00', NULL, '066842e7-54a4-40cf-8218-f8018464e5d6'),
	('00000000-0000-0000-0000-000000000000', 94, '2k7snttp5ztz', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', false, '2025-07-26 12:29:20.291556+00', '2025-07-26 12:29:20.291556+00', NULL, 'd303e084-1efc-4954-b196-ee012152ca00'),
	('00000000-0000-0000-0000-000000000000', 95, 'kzodxsmjdufl', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', false, '2025-07-26 12:30:40.850381+00', '2025-07-26 12:30:40.850381+00', NULL, '56ec2cc9-8236-4322-9cb1-adddc555f62f'),
	('00000000-0000-0000-0000-000000000000', 96, 'la6dp7tdra2w', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', false, '2025-07-26 12:32:29.777138+00', '2025-07-26 12:32:29.777138+00', NULL, 'a28bc6dd-61e0-43d7-91cd-4eaaa0549196'),
	('00000000-0000-0000-0000-000000000000', 97, 'odvoujn72xz6', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', true, '2025-07-26 12:53:26.286124+00', '2025-07-26 13:51:29.129845+00', NULL, '1b074ec5-aeb2-4a4d-8cd2-b78c3beeba37'),
	('00000000-0000-0000-0000-000000000000', 98, 'w7u42g63kvoj', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', true, '2025-07-26 13:51:29.131992+00', '2025-07-26 14:50:00.004382+00', 'odvoujn72xz6', '1b074ec5-aeb2-4a4d-8cd2-b78c3beeba37'),
	('00000000-0000-0000-0000-000000000000', 99, 'dfx7t7zbixu4', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', true, '2025-07-26 14:50:00.005047+00', '2025-07-26 15:48:29.860231+00', 'w7u42g63kvoj', '1b074ec5-aeb2-4a4d-8cd2-b78c3beeba37');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."locations" ("id", "name", "description", "address", "city", "state_province", "country", "postal_code", "coordinates", "place_type", "tags", "google_place_id", "created_by", "verified", "active", "created_at", "updated_at", "place_type_backup", "avg_safety_score", "avg_comfort_score", "avg_overall_score", "review_count") VALUES
	('4ecb477f-330a-481f-840f-0b90b8a5afca', 'Mama Rosa''s Italian', 'Traditional family-owned Italian restaurant since 1952', '321 Little Italy Street', 'Metro City', 'CA', 'US', NULL, '0101000020E6100000C139234A7B9B5EC0EE5A423EE8E14240', 'restaurant', NULL, NULL, '43ad6c42-21fa-4e47-ac55-0c8004706f9a', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:11:34.124957+00', NULL, NULL, NULL, NULL, 0),
	('143b52ad-1e4f-4a9b-b81d-64a2e8447d52', 'Riverside Bed & Breakfast', 'Small family-owned inn with garden views', '888 River Road', 'Metro City', 'CA', 'US', NULL, '0101000020E6100000A2B437F8C29C5EC02C6519E258DF4240', 'lodging', NULL, NULL, '2713d912-0fa8-4905-b0ec-6699f6946e89', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:11:34.124957+00', NULL, NULL, NULL, NULL, 0),
	('71efb27c-f368-4b4f-9d6c-2b5ef5b530c2', 'Budget Motel 6', 'Economy lodging near highway', '999 Highway 101', 'Metro City', 'CA', 'US', NULL, '0101000020E610000013F241CF669D5EC04BEA043411DE4240', 'lodging', NULL, NULL, '27c819f4-742a-40e5-83f4-a86d9f2b25dd', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:11:34.124957+00', NULL, NULL, NULL, NULL, 0),
	('1941ebb9-6529-4a53-a0b0-fd957fe5cf0b', 'Westfield Metro Mall', 'Large retail center with 200+ stores', '777 Shopping Center Drive', 'Metro City', 'CA', 'US', NULL, '0101000020E6100000832F4CA60A9E5EC0696FF085C9DC4240', 'shopping_mall', NULL, NULL, '2713d912-0fa8-4905-b0ec-6699f6946e89', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:11:34.124957+00', NULL, NULL, NULL, NULL, 0),
	('4cb9c306-9a14-4fd5-a09d-79217145556e', 'First National Bank', 'Financial services and ATM', '222 Finance Street', 'Metro City', 'CA', 'US', NULL, '0101000020E61000008E06F01648985EC055C1A8A44EE84240', 'bank', NULL, NULL, '572aa506-5d2c-4a28-9e7c-a5b4be39a033', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:11:34.124957+00', NULL, NULL, NULL, NULL, 0),
	('52e5e989-2924-48d5-991a-33b999982dcf', 'Metro City DMV Office', 'Department of Motor Vehicles government office', '333 Government Way', 'Metro City', 'CA', 'US', NULL, '0101000020E6100000F46C567DAE9E5EC088F4DBD781DB4240', 'local_government_office', NULL, NULL, '572aa506-5d2c-4a28-9e7c-a5b4be39a033', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:11:34.124957+00', NULL, NULL, NULL, NULL, 0),
	('322d43a3-9a3d-4a97-8283-f028aef3466d', 'Metro Central Station', 'Main public transit hub with multiple bus and train lines', '111 Transit Plaza', 'Metro City', 'CA', 'US', NULL, '0101000020E61000001DC9E53FA4975EC0363CBD5296E94240', 'train_station', NULL, NULL, '572aa506-5d2c-4a28-9e7c-a5b4be39a033', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:11:34.124957+00', NULL, NULL, NULL, NULL, 0),
	('bae583f1-632a-4072-a912-a9c78495f37e', 'Rideshare Pickup Zone', 'Designated Uber/Lyft pickup area at Metro Airport', '500 Airport Terminal Road', 'Metro City', 'CA', 'US', NULL, '0101000020E6100000D5E76A2BF69F5EC0C5FEB27BF2D84240', 'taxi_stand', NULL, NULL, '572aa506-5d2c-4a28-9e7c-a5b4be39a033', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:11:34.124957+00', NULL, NULL, NULL, NULL, 0),
	('6525e18c-7983-406e-83a1-a03ad89174cc', 'Halal Kitchen Express', 'Authentic Middle Eastern cuisine with halal certification', '789 Heritage Boulevard', 'Metro City', 'CA', 'US', NULL, '0101000020E6100000E0BE0E9C339A5EC0B1506B9A77E44240', 'restaurant', NULL, NULL, 'fd5aa6d0-3b0b-4eb1-bd79-16282ececb7d', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:17:15.412724+00', NULL, 4.25, 3.75, 4.25, 4),
	('e70a9981-32f6-4198-8757-a4667e9ef7ee', 'Airport Parking Structure B', 'Multi-level parking garage at Metro Airport', '444 Airport Boulevard', 'Metro City', 'CA', 'US', NULL, '0101000020E610000065AA6054529F5EC0A779C7293ADA4240', 'parking', NULL, NULL, '572aa506-5d2c-4a28-9e7c-a5b4be39a033', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:17:15.412724+00', NULL, 3.00, 3.00, 3.00, 5),
	('9830eb2a-0216-4d6d-8cbc-2c24bb553325', 'The Craft Brewery', 'Trendy craft beer bar with late-night crowd', '654 Brewery Row', 'Metro City', 'CA', 'US', NULL, '0101000020E610000032772D211F9C5EC00DE02D90A0E04240', 'bar', NULL, NULL, 'bff9a0b4-c4bf-44af-b946-0925a7813778', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:17:15.412724+00', NULL, 4.20, 4.20, 4.20, 5),
	('d9a1a443-dd0c-4aee-8ce2-219e4ad3c390', 'Murphy''s Tavern', 'Local neighborhood bar and grill with live music on weekends', '123 Main Street', 'Metro City', 'CA', 'US', NULL, '0101000020E610000050FC1873D79A5EC0D0D556EC2FE34240', 'bar', NULL, NULL, '572aa506-5d2c-4a28-9e7c-a5b4be39a033', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:17:15.412724+00', NULL, 3.25, 3.25, 3.00, 4),
	('07c13e26-6209-48fe-bfac-a08b46a02b72', 'QuickStop Gas Station', '24-hour convenience store and gas station', '555 Industrial Avenue', 'Metro City', 'CA', 'US', NULL, '0101000020E6100000FE43FAEDEB985EC0744694F606E74240', 'gas_station', NULL, NULL, '572aa506-5d2c-4a28-9e7c-a5b4be39a033', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:17:15.412724+00', NULL, 3.20, 2.60, 2.60, 5),
	('4ecc2a48-dc2a-4203-bf90-30b4eca296e7', 'Downtown Marriott', 'Business hotel chain in financial district', '100 Corporate Plaza', 'Metro City', 'CA', 'US', NULL, '0101000020E61000006F8104C58F995EC092CB7F48BFE54240', 'lodging', NULL, NULL, '572aa506-5d2c-4a28-9e7c-a5b4be39a033', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:17:15.412724+00', NULL, 3.75, 3.25, 3.50, 4),
	('09b09a50-b9cd-4a07-8195-0495a8c2d6f8', 'Rainbow Bistro', 'Modern LGBTQ+-friendly restaurant with diverse menu', '456 Castro Avenue', 'Metro City', 'CA', 'US', NULL, '0101000020E61000007958A835CD9B5EC061C3D32B65E14240', 'restaurant', NULL, NULL, 'd6e0b882-d8d6-4443-b5c3-1e18eab1a7a1', false, true, '2025-07-24 23:11:34.124957+00', '2025-07-24 23:17:15.412724+00', NULL, 4.20, 3.60, 4.00, 5);


--
-- Data for Name: ml_training_data; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "user_id", "demographics", "onboarding_complete", "created_at", "updated_at") VALUES
	('1b941f62-dd2d-41ba-8448-49583bd4dbb8', '572aa506-5d2c-4a28-9e7c-a5b4be39a033', '{}', false, '2025-07-18 18:30:12.482004+00', '2025-07-18 18:30:12.482004+00'),
	('48a5b06b-dec5-43ab-8f77-393da8ad6e8c', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '{}', false, '2025-07-18 20:16:42.436139+00', '2025-07-18 20:16:42.436139+00'),
	('f0cdd0bf-7cab-4812-883e-d74eaf67f405', '88bb1b77-a84e-4c13-a787-0ff4b797376d', '{}', false, '2025-07-18 20:20:51.237976+00', '2025-07-18 20:20:51.237976+00'),
	('71f8719d-bc0a-456f-a606-e3a99685e8ee', '27c819f4-742a-40e5-83f4-a86d9f2b25dd', '{}', false, '2025-07-24 22:20:48.580233+00', '2025-07-24 22:20:48.580233+00'),
	('f99fdca4-ea85-464d-8898-dd23ccdef7f1', '6cb20cc1-1bf2-41c5-bdba-c5ce76ef4859', '{}', false, '2025-07-24 22:33:01.430072+00', '2025-07-24 22:33:01.430072+00'),
	('ede29ade-1483-47b2-b953-e922435fb348', 'fa1cb7a2-3b20-4d6d-9643-8a4477735275', '{}', false, '2025-07-24 22:33:29.420063+00', '2025-07-24 22:33:29.420063+00'),
	('2c27c7de-cb5a-4b6a-884b-53f3e8874e6a', '2713d912-0fa8-4905-b0ec-6699f6946e89', '{}', false, '2025-07-24 22:33:51.651972+00', '2025-07-24 22:33:51.651972+00'),
	('9479a458-ba51-4145-919f-c8e307de9fc3', 'd6e0b882-d8d6-4443-b5c3-1e18eab1a7a1', '{}', false, '2025-07-24 22:34:17.470114+00', '2025-07-24 22:34:17.470114+00'),
	('3c356ba7-6c1a-47e1-bd9a-d1db43642dc5', '43ad6c42-21fa-4e47-ac55-0c8004706f9a', '{}', false, '2025-07-24 22:34:38.63443+00', '2025-07-24 22:34:38.63443+00'),
	('b8921f82-9bb0-44b6-9b06-b40863775fa3', 'bff9a0b4-c4bf-44af-b946-0925a7813778', '{}', false, '2025-07-24 22:34:52.702155+00', '2025-07-24 22:34:52.702155+00'),
	('e6652cd0-76cf-40ff-8fad-a6d4186f04f9', 'fd5aa6d0-3b0b-4eb1-bd79-16282ececb7d', '{}', false, '2025-07-24 22:35:10.749425+00', '2025-07-24 22:35:10.749425+00');


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."reviews" ("id", "location_id", "user_id", "title", "content", "overall_rating", "safety_rating", "comfort_rating", "accessibility_rating", "service_rating", "visit_type", "photo_urls", "status", "flag_count", "helpful_count", "unhelpful_count", "created_at", "updated_at", "visited_at") VALUES
	('212049c3-ddce-4ed8-b3ab-c4093a48e2a8', '6525e18c-7983-406e-83a1-a03ad89174cc', 'fd5aa6d0-3b0b-4eb1-bd79-16282ececb7d', 'Finally, authentic halal food!', 'Amazing authentic Middle Eastern cuisine with proper halal certification. Staff was incredibly welcoming and knowledgeable about ingredients. Felt completely comfortable and safe.', 5.0, 5, 5, NULL, NULL, 'family', NULL, 'active', 0, 0, 0, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:14:40.326747+00', '2025-07-20 19:30:00+00'),
	('c28cd9ee-7097-4b2b-b2ec-ba4f7061f55e', '6525e18c-7983-406e-83a1-a03ad89174cc', '6cb20cc1-1bf2-41c5-bdba-c5ce76ef4859', 'Great food, friendly service', 'Excellent halal options and very clean kitchen. Staff understood dietary requirements perfectly. Will definitely return.', 5.0, 4, 5, NULL, NULL, 'couple', NULL, 'active', 0, 0, 0, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:14:40.326747+00', '2025-07-18 20:15:00+00'),
	('78f619e3-8d70-4e3d-bc0d-8e7c02dd3258', '6525e18c-7983-406e-83a1-a03ad89174cc', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', 'Good food, felt out of place', 'Food was very good and clean, but felt like I didn''t quite belong. Staff was polite but seemed more focused on other customers.', 4.0, 4, 3, NULL, NULL, 'solo', NULL, 'active', 0, 0, 0, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:14:40.326747+00', '2025-07-15 18:45:00+00'),
	('090de648-b61b-4e4d-88a6-8b4863fd407f', '6525e18c-7983-406e-83a1-a03ad89174cc', '572aa506-5d2c-4a28-9e7c-a5b4be39a033', 'Food was okay, felt out of place', 'Food was decent but I felt out of place. Seemed like a very specific community space.', 3.0, 4, 2, NULL, NULL, 'solo', NULL, 'active', 0, 0, 0, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:14:40.326747+00', '2025-07-12 19:00:00+00'),
	('4d345e4f-e27a-4e7e-aef8-00038a92705d', '9830eb2a-0216-4d6d-8cbc-2c24bb553325', 'd6e0b882-d8d6-4443-b5c3-1e18eab1a7a1', 'Rainbow flag in window - felt welcomed!', 'Amazing LGBTQ+ friendly atmosphere! Rainbow flag prominently displayed, staff was incredibly welcoming, and felt completely safe being myself.', 5.0, 5, 5, NULL, NULL, 'couple', NULL, 'active', 0, 0, 0, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:14:40.326747+00', '2025-07-19 22:30:00+00'),
	('efedfd81-eb9b-4850-b118-508ce7205dc6', '9830eb2a-0216-4d6d-8cbc-2c24bb553325', 'bff9a0b4-c4bf-44af-b946-0925a7813778', 'Bartender used correct pronouns!', 'Staff asked for pronouns and used them correctly all night. Felt respected and safe. Great beer selection too!', 5.0, 4, 5, NULL, NULL, 'group', NULL, 'active', 0, 0, 0, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:14:40.326747+00', '2025-07-17 21:15:00+00'),
	('20922827-289c-40f0-85d4-d30c1e0a6b02', '9830eb2a-0216-4d6d-8cbc-2c24bb553325', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', 'Great atmosphere for our community', 'Welcoming space for LGBTQ+ folks. Felt comfortable and safe throughout the evening.', 4.0, 4, 4, NULL, NULL, 'couple', NULL, 'active', 0, 0, 0, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:14:40.326747+00', '2025-07-14 20:45:00+00'),
	('b05d3e51-8869-4a3d-b38f-199e7fc62a44', '9830eb2a-0216-4d6d-8cbc-2c24bb553325', 'fa1cb7a2-3b20-4d6d-9643-8a4477735275', 'Good drinks, lively crowd', 'Decent craft beer selection and friendly atmosphere. Nothing stood out as particularly special.', 4.0, 4, 4, NULL, NULL, 'group', NULL, 'active', 0, 0, 0, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:14:40.326747+00', '2025-07-16 21:00:00+00'),
	('fd32ceea-c24d-417d-ab6f-49c512b39e60', '9830eb2a-0216-4d6d-8cbc-2c24bb553325', '572aa506-5d2c-4a28-9e7c-a5b4be39a033', 'Decent beer, felt out of place', 'Beer was good but felt like I didn''t fit in with the crowd. Seemed very cliquish.', 3.0, 4, 3, NULL, NULL, 'solo', NULL, 'active', 0, 0, 0, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:14:40.326747+00', '2025-07-13 22:00:00+00'),
	('98d27ddf-7bf9-469f-ae32-8dd831c2cc1a', '07c13e26-6209-48fe-bfac-a08b46a02b72', '572aa506-5d2c-4a28-9e7c-a5b4be39a033', 'Quick in and out, no issues', 'Standard gas station experience. Staff was friendly, transaction was quick.', 4.0, 5, 4, NULL, NULL, 'solo', NULL, 'active', 0, 0, 0, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:14:40.326747+00', '2025-07-21 14:30:00+00'),
	('5d1f0a13-a861-447b-85d3-f06a84e57517', '07c13e26-6209-48fe-bfac-a08b46a02b72', '2713d912-0fa8-4905-b0ec-6699f6946e89', 'Normal gas station stop', 'Nothing special but got what I needed. Staff was professional.', 4.0, 4, 4, NULL, NULL, 'solo', NULL, 'active', 0, 0, 0, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:14:40.326747+00', '2025-07-19 16:15:00+00'),
	('c17814eb-9805-49b5-bbd4-3b04e1cd87e8', '07c13e26-6209-48fe-bfac-a08b46a02b72', 'fa1cb7a2-3b20-4d6d-9643-8a4477735275', 'Felt watched and uncomfortable', 'Clerk seemed to be watching me constantly while I shopped. Made me very uncomfortable. Won''t return.', 2.0, 2, 2, NULL, NULL, 'solo', NULL, 'active', 0, 0, 0, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:14:40.326747+00', '2025-07-17 15:45:00+00'),
	('8950ce96-e179-48c9-a400-5e7ffd11ebba', '07c13e26-6209-48fe-bfac-a08b46a02b72', '88bb1b77-a84e-4c13-a787-0ff4b797376d', 'Cashier seemed suspicious of me', 'Cashier asked for extra ID when using credit card and seemed to scrutinize everything I did.', 2.0, 3, 2, NULL, NULL, 'solo', NULL, 'active', 0, 0, 0, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:14:40.326747+00', '2025-07-15 17:20:00+00'),
	('75d92f36-2df3-4b6c-bceb-612420144ee7', '07c13e26-6209-48fe-bfac-a08b46a02b72', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', 'Asked for extra ID, very uncomfortable', 'Staff demanded extra identification for credit card purchase and followed me around store. Felt discriminated against.', 1.0, 2, 1, NULL, NULL, 'solo', NULL, 'active', 0, 0, 0, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:14:40.326747+00', '2025-07-14 18:00:00+00'),
	('08d48419-e8df-4037-83bc-a38a67a8fdb4', 'e70a9981-32f6-4198-8757-a4667e9ef7ee', '572aa506-5d2c-4a28-9e7c-a5b4be39a033', 'Well-lit, good security', 'Felt completely safe walking to my car even late at night. Good lighting and visible security cameras.', 4.0, 4, 4, NULL, NULL, 'business', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-20 23:30:00+00'),
	('601fb32b-5a9d-4f80-a916-7d18e07b259b', 'e70a9981-32f6-4198-8757-a4667e9ef7ee', 'fa1cb7a2-3b20-4d6d-9643-8a4477735275', 'Felt safe walking alone', 'No issues walking through the garage alone. Security presence was visible.', 4.0, 4, 4, NULL, NULL, 'business', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-18 22:15:00+00'),
	('7acc8eed-ad93-43ba-a213-294ea722e07e', 'e70a9981-32f6-4198-8757-a4667e9ef7ee', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', 'Dark corners, felt vulnerable at night', 'Too many dark corners and blind spots. Felt very unsafe walking alone at night. Had to call for escort.', 2.0, 2, 2, NULL, NULL, 'business', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-16 22:45:00+00'),
	('eaab699f-477e-4805-80a6-06a3972bcd91', 'e70a9981-32f6-4198-8757-a4667e9ef7ee', '2713d912-0fa8-4905-b0ec-6699f6946e89', 'Stayed near security cameras', 'Made sure to park near security cameras and walked quickly. Still felt nervous.', 3.0, 2, 3, NULL, NULL, 'business', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-14 21:30:00+00'),
	('f106fac6-32ef-4851-b5bf-d99dde7efe64', 'e70a9981-32f6-4198-8757-a4667e9ef7ee', '43ad6c42-21fa-4e47-ac55-0c8004706f9a', 'Had someone walk me to car', 'Too dangerous to walk alone. Had to ask airport security to escort me to my car.', 2.0, 3, 2, NULL, NULL, 'family', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-12 20:00:00+00'),
	('9867c252-aea8-460d-aa40-5237efc1de32', 'd9a1a443-dd0c-4aee-8ce2-219e4ad3c390', '572aa506-5d2c-4a28-9e7c-a5b4be39a033', 'Great local neighborhood spot', 'Perfect local bar with friendly regulars. Always feel welcome here.', 4.0, 4, 5, NULL, NULL, 'group', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-19 20:30:00+00'),
	('71776524-0f45-4a5d-8b31-33af447d4807', 'd9a1a443-dd0c-4aee-8ce2-219e4ad3c390', 'fa1cb7a2-3b20-4d6d-9643-8a4477735275', 'Decent drinks, some stares', 'Drinks were good but felt some unwelcome stares from regulars. Not terrible but not great.', 3.0, 3, 3, NULL, NULL, 'couple', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-17 21:15:00+00'),
	('e1812c2d-2461-4991-828a-a00f7c06fffc', 'd9a1a443-dd0c-4aee-8ce2-219e4ad3c390', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', 'Uncomfortable atmosphere', 'Felt very out of place. Regulars were not welcoming and made me feel unwanted.', 2.0, 3, 2, NULL, NULL, 'solo', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-15 19:45:00+00'),
	('b6733bd2-d5f4-4b5f-ab8a-ef0bf5e6308a', 'd9a1a443-dd0c-4aee-8ce2-219e4ad3c390', '88bb1b77-a84e-4c13-a787-0ff4b797376d', 'Okay for a quick drink', 'Nothing special. Got my drink and left. Didn''t feel particularly welcome.', 3.0, 3, 3, NULL, NULL, 'solo', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-13 20:00:00+00'),
	('f2818ee5-d7d7-4e05-addd-5c77b9c131c5', '4ecc2a48-dc2a-4203-bf90-30b4eca296e7', '572aa506-5d2c-4a28-9e7c-a5b4be39a033', 'Perfect for business travel', 'Excellent service, professional staff, felt completely comfortable throughout stay.', 5.0, 5, 5, NULL, NULL, 'business', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-18 15:00:00+00'),
	('09ccb9dc-c5ae-437f-9dbb-9b7f86bf997a', '4ecc2a48-dc2a-4203-bf90-30b4eca296e7', '2713d912-0fa8-4905-b0ec-6699f6946e89', 'Professional service', 'Staff was courteous and professional. Good business hotel experience.', 4.0, 4, 4, NULL, NULL, 'business', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-16 16:30:00+00'),
	('16cb20d9-c06d-42b5-a948-b9c5a828eb27', '4ecc2a48-dc2a-4203-bf90-30b4eca296e7', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', 'Uncomfortable interactions with staff', 'Staff seemed to question my presence and asked for multiple forms of ID. Made me feel unwelcome.', 2.0, 3, 2, NULL, NULL, 'business', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-14 14:15:00+00'),
	('c9421a8b-2d69-40c0-9ea9-c0fb1c385370', '4ecc2a48-dc2a-4203-bf90-30b4eca296e7', '43ad6c42-21fa-4e47-ac55-0c8004706f9a', 'Felt scrutinized by staff', 'Felt like staff was watching my every move. Not the welcoming experience I expected.', 3.0, 3, 2, NULL, NULL, 'family', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-12 17:45:00+00'),
	('adae8f21-c0a9-4f8a-b372-df30d505841c', '09b09a50-b9cd-4a07-8195-0495a8c2d6f8', 'd6e0b882-d8d6-4443-b5c3-1e18eab1a7a1', 'Incredible welcoming space!', 'Amazing LGBTQ+ friendly restaurant! Staff was incredibly welcoming and the atmosphere was perfect.', 5.0, 5, 5, NULL, NULL, 'couple', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-19 19:30:00+00'),
	('cbd7eecb-927d-49e8-b8f0-b7ad0d1c386b', '09b09a50-b9cd-4a07-8195-0495a8c2d6f8', 'bff9a0b4-c4bf-44af-b946-0925a7813778', 'Respectful and inclusive', 'Staff respected pronouns and created an inclusive environment. Felt completely safe.', 5.0, 5, 5, NULL, NULL, 'group', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-17 20:15:00+00'),
	('377d55de-d084-4669-884c-1ee3ed036931', '09b09a50-b9cd-4a07-8195-0495a8c2d6f8', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', 'Finally, a truly safe space', 'Felt completely comfortable being myself. Staff was amazing and atmosphere welcoming.', 5.0, 5, 5, NULL, NULL, 'couple', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-15 18:45:00+00'),
	('dfd1afd2-1c14-4a8c-80ae-3d448133fd6a', '09b09a50-b9cd-4a07-8195-0495a8c2d6f8', '572aa506-5d2c-4a28-9e7c-a5b4be39a033', 'Felt out of place', 'Food was good but felt like I didn''t belong. Very specific crowd.', 3.0, 4, 2, NULL, NULL, 'solo', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-13 19:00:00+00'),
	('f7d3575e-0dd1-489b-b37b-5f10c278bb60', '09b09a50-b9cd-4a07-8195-0495a8c2d6f8', '88bb1b77-a84e-4c13-a787-0ff4b797376d', 'Hostile environment - felt threatened', 'Staff was unwelcoming and other patrons made me feel unwanted. Left early.', 2.0, 2, 1, NULL, NULL, 'solo', NULL, 'active', 0, 0, 0, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:16:37.082833+00', '2025-07-11 20:30:00+00'),
	('da53b89b-16c1-47ea-af08-6c14f40e7177', '4ecb477f-330a-481f-840f-0b90b8a5afca', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', 'It‘s amazing', 'Lorem Ipsum', 5.0, 5, 5, 5, 5, 'business', NULL, 'active', 0, 0, 0, '2025-07-26 11:45:28.849912+00', '2025-07-26 11:45:28.849912+00', '2025-07-26 11:44:40.259+00');


--
-- Data for Name: review_votes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: route_segments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: safety_scores; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."safety_scores" ("id", "location_id", "demographic_type", "demographic_value", "avg_safety_score", "avg_comfort_score", "avg_overall_score", "review_count", "last_review_date", "calculated_at") VALUES
	('d990072a-1b3c-47b5-8b19-6f6efe79ce67', '6525e18c-7983-406e-83a1-a03ad89174cc', 'overall', NULL, 4.25, 3.75, 4.25, 4, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('865a695c-75a0-4236-83fd-fd77ccb001ca', '6525e18c-7983-406e-83a1-a03ad89174cc', 'race_ethnicity', 'black', 4.00, 3.00, 4.00, 1, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('3ad8c1c3-f66e-4a44-a133-e20507936971', '6525e18c-7983-406e-83a1-a03ad89174cc', 'race_ethnicity', 'middle_eastern', 5.00, 5.00, 5.00, 1, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('84b82886-4acc-4c97-9533-10d4c0e8c76d', '6525e18c-7983-406e-83a1-a03ad89174cc', 'race_ethnicity', 'south_asian', 4.00, 5.00, 5.00, 1, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('79d1afb2-71af-4b3a-93e0-e41baf8ac4ff', '6525e18c-7983-406e-83a1-a03ad89174cc', 'race_ethnicity', 'white', 4.00, 2.00, 3.00, 1, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('3c83cb74-e237-4fc5-bff3-17507d13f626', '6525e18c-7983-406e-83a1-a03ad89174cc', 'gender', 'woman', 4.33, 4.33, 4.67, 3, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('209e39b1-3088-4388-aa96-e41a9646db4a', '6525e18c-7983-406e-83a1-a03ad89174cc', 'gender', 'man', 4.00, 2.00, 3.00, 1, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('9ff07408-bf81-4ee2-a694-dd6d1c93919e', 'e70a9981-32f6-4198-8757-a4667e9ef7ee', 'overall', NULL, 3.00, 3.00, 3.00, 5, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('4df354c8-0171-452f-8185-be3f2bff2ded', 'e70a9981-32f6-4198-8757-a4667e9ef7ee', 'race_ethnicity', 'asian', 2.00, 3.00, 3.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('97b52c59-d8af-460f-b6fc-299445df82ae', 'e70a9981-32f6-4198-8757-a4667e9ef7ee', 'race_ethnicity', 'black', 3.00, 3.00, 3.00, 2, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('d6f0877c-65d3-4273-b9e4-3b6254380c09', 'e70a9981-32f6-4198-8757-a4667e9ef7ee', 'race_ethnicity', 'hispanic_latino', 3.00, 2.00, 2.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('94779b36-164c-47ee-922f-a5ab501a3b78', 'e70a9981-32f6-4198-8757-a4667e9ef7ee', 'race_ethnicity', 'white', 4.00, 4.00, 4.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('bc127d87-3f53-4d29-a79e-3d70224a7353', 'e70a9981-32f6-4198-8757-a4667e9ef7ee', 'gender', 'man', 4.00, 4.00, 4.00, 2, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('745bc3ee-080a-43e6-8ea8-0be02bfad699', 'e70a9981-32f6-4198-8757-a4667e9ef7ee', 'gender', 'woman', 2.33, 2.33, 2.33, 3, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('4939d0ec-8fa1-46ba-8e1a-5c8b44e380f2', '9830eb2a-0216-4d6d-8cbc-2c24bb553325', 'overall', NULL, 4.20, 4.20, 4.20, 5, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('16c958b9-291b-4cdd-975f-1c9ddd4de016', '9830eb2a-0216-4d6d-8cbc-2c24bb553325', 'race_ethnicity', 'asian', 5.00, 5.00, 5.00, 1, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('b8899da7-fe12-456b-b97c-a7aeaaa4f194', '9830eb2a-0216-4d6d-8cbc-2c24bb553325', 'race_ethnicity', 'black', 4.00, 4.00, 4.00, 2, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('e5d4ed8d-b851-47a4-827b-cb3fc2825ce9', '9830eb2a-0216-4d6d-8cbc-2c24bb553325', 'race_ethnicity', 'white', 4.00, 4.00, 4.00, 2, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('bdd5de88-ed08-47cc-a1e6-4e572b54a42a', '9830eb2a-0216-4d6d-8cbc-2c24bb553325', 'gender', 'woman', 4.00, 4.00, 4.00, 1, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('bbb16a13-b06b-4b7a-81ae-df146f52cfd2', '9830eb2a-0216-4d6d-8cbc-2c24bb553325', 'gender', 'non-binary', 4.00, 5.00, 5.00, 1, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('69f962a7-4ced-4148-a30e-39302c361e67', '9830eb2a-0216-4d6d-8cbc-2c24bb553325', 'gender', 'man', 4.33, 4.00, 4.00, 3, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('8ec61532-024d-43db-b2a3-6ce151ecf181', 'd9a1a443-dd0c-4aee-8ce2-219e4ad3c390', 'overall', NULL, 3.25, 3.25, 3.00, 4, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('b3d6da8d-aa45-4ce6-8409-469ae5793efa', 'd9a1a443-dd0c-4aee-8ce2-219e4ad3c390', 'race_ethnicity', 'black', 3.00, 2.50, 2.50, 2, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('f4b2f32b-2967-4b25-8147-4cf99a71addd', 'd9a1a443-dd0c-4aee-8ce2-219e4ad3c390', 'race_ethnicity', 'hispanic_latino', 3.00, 3.00, 3.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('8743c19a-7d4f-40c6-8685-3d4f1e0170b7', 'd9a1a443-dd0c-4aee-8ce2-219e4ad3c390', 'race_ethnicity', 'white', 4.00, 5.00, 4.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('587efa1c-c965-48a8-90ba-31997b93b329', 'd9a1a443-dd0c-4aee-8ce2-219e4ad3c390', 'gender', 'man', 3.33, 3.67, 3.33, 3, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('a12d4f40-f9c6-4b6b-a2fc-6fc412147768', 'd9a1a443-dd0c-4aee-8ce2-219e4ad3c390', 'gender', 'woman', 3.00, 2.00, 2.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('b341f8f2-35b5-437c-b0e9-cc3e14c0c66f', '07c13e26-6209-48fe-bfac-a08b46a02b72', 'overall', NULL, 3.20, 2.60, 2.60, 5, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('9ef6b5b9-ebdd-4edc-856c-a7f08aa907de', '07c13e26-6209-48fe-bfac-a08b46a02b72', 'race_ethnicity', 'asian', 4.00, 4.00, 4.00, 1, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('b1b30010-fb21-41a9-847a-71127b76388a', '07c13e26-6209-48fe-bfac-a08b46a02b72', 'race_ethnicity', 'black', 2.00, 1.50, 1.50, 2, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('66bb3fce-a878-4528-b543-f7fc5a34e897', '07c13e26-6209-48fe-bfac-a08b46a02b72', 'race_ethnicity', 'hispanic_latino', 3.00, 2.00, 2.00, 1, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('3bb47353-44b7-460c-b9bc-83592df088d5', '07c13e26-6209-48fe-bfac-a08b46a02b72', 'race_ethnicity', 'white', 5.00, 4.00, 4.00, 1, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('b85f46e2-303a-4970-ad9b-2b87a4256b41', '07c13e26-6209-48fe-bfac-a08b46a02b72', 'gender', 'woman', 3.00, 2.50, 2.50, 2, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('c12e4c33-8646-4bd5-81e6-8c98bcd6d398', '07c13e26-6209-48fe-bfac-a08b46a02b72', 'gender', 'man', 3.33, 2.67, 2.67, 3, '2025-07-24 23:14:40.326747+00', '2025-07-24 23:17:15.412724+00'),
	('5fb76e48-9647-4ec4-8348-8476fe72b314', '4ecc2a48-dc2a-4203-bf90-30b4eca296e7', 'overall', NULL, 3.75, 3.25, 3.50, 4, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('8a0e1d63-17e8-48b8-b631-74f4df61e829', '4ecc2a48-dc2a-4203-bf90-30b4eca296e7', 'race_ethnicity', 'asian', 4.00, 4.00, 4.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('c51be311-89d5-473b-80af-1ffa113e56d0', '4ecc2a48-dc2a-4203-bf90-30b4eca296e7', 'race_ethnicity', 'black', 3.00, 2.00, 2.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('7dfb1f51-957a-425f-884d-8a7f30311382', '4ecc2a48-dc2a-4203-bf90-30b4eca296e7', 'race_ethnicity', 'hispanic_latino', 3.00, 2.00, 3.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('331740ea-b58d-4588-a555-4ef654cf39f4', '4ecc2a48-dc2a-4203-bf90-30b4eca296e7', 'race_ethnicity', 'white', 5.00, 5.00, 5.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('5482e7f4-0bd4-4c00-b0c7-edb95515bca4', '4ecc2a48-dc2a-4203-bf90-30b4eca296e7', 'gender', 'man', 5.00, 5.00, 5.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('d723664c-2998-4a80-bad5-d3343306f09e', '4ecc2a48-dc2a-4203-bf90-30b4eca296e7', 'gender', 'woman', 3.33, 2.67, 3.00, 3, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('03b839de-313b-45db-9cb1-ab1a2c1fbc57', '09b09a50-b9cd-4a07-8195-0495a8c2d6f8', 'overall', NULL, 4.20, 3.60, 4.00, 5, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('3590abe4-ec23-472f-9362-afd4a1ce821d', '09b09a50-b9cd-4a07-8195-0495a8c2d6f8', 'race_ethnicity', 'asian', 5.00, 5.00, 5.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('0f9305e9-5085-4fa0-9d70-1f5bd0ec23cc', '09b09a50-b9cd-4a07-8195-0495a8c2d6f8', 'race_ethnicity', 'black', 5.00, 5.00, 5.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('403e8129-3467-4b69-9b9d-1fc2b44b01ff', '09b09a50-b9cd-4a07-8195-0495a8c2d6f8', 'race_ethnicity', 'hispanic_latino', 2.00, 1.00, 2.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('7df01f81-4535-428d-bed8-f8d17b9e94c3', '09b09a50-b9cd-4a07-8195-0495a8c2d6f8', 'race_ethnicity', 'white', 4.50, 3.50, 4.00, 2, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('a4f86ff8-6cdc-4635-bcda-a0b2498ec7d3', '09b09a50-b9cd-4a07-8195-0495a8c2d6f8', 'gender', 'man', 3.67, 2.67, 3.33, 3, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('c129e013-9ede-41e7-8641-58661b384b35', '09b09a50-b9cd-4a07-8195-0495a8c2d6f8', 'gender', 'non-binary', 5.00, 5.00, 5.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('2edd2add-c64e-490c-98fb-ef52c0957fa4', '09b09a50-b9cd-4a07-8195-0495a8c2d6f8', 'gender', 'woman', 5.00, 5.00, 5.00, 1, '2025-07-24 23:16:37.082833+00', '2025-07-24 23:17:15.412724+00'),
	('a82b1236-6ee6-4593-bff4-5405594eb25b', '4ecb477f-330a-481f-840f-0b90b8a5afca', 'overall', NULL, 5.00, 5.00, 5.00, 1, '2025-07-26 11:45:28.849912+00', '2025-07-26 11:45:28.849912+00'),
	('2e759098-84bd-4199-96b0-0138b0f2e0b1', '4ecb477f-330a-481f-840f-0b90b8a5afca', 'race_ethnicity', 'black', 5.00, 5.00, 5.00, 1, '2025-07-26 11:45:28.849912+00', '2025-07-26 11:45:28.849912+00'),
	('cabd12d5-1482-49dd-be86-f3511909787b', '4ecb477f-330a-481f-840f-0b90b8a5afca', 'race_ethnicity', 'Black/African American', 5.00, 5.00, 5.00, 1, '2025-07-26 11:45:28.849912+00', '2025-07-26 11:45:28.849912+00'),
	('36955b43-ce19-48af-9c63-f565d7d7bb8d', '4ecb477f-330a-481f-840f-0b90b8a5afca', 'gender', 'Female', 5.00, 5.00, 5.00, 1, '2025-07-26 11:45:28.849912+00', '2025-07-26 11:45:28.849912+00');


--
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--



--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_profiles" ("id", "username", "full_name", "avatar_url", "race_ethnicity", "gender", "lgbtq_status", "disability_status", "religion", "age_range", "privacy_level", "show_demographics", "total_reviews", "helpful_votes", "created_at", "updated_at") VALUES
	('88bb1b77-a84e-4c13-a787-0ff4b797376d', 'carlos_rodriguez', 'Carlos Rodriguez', NULL, '{hispanic_latino}', 'man', false, NULL, NULL, '28-34', 'public', true, 0, 0, '2025-07-24 23:10:21.184911+00', '2025-07-24 23:10:21.184911+00'),
	('572aa506-5d2c-4a28-9e7c-a5b4be39a033', 'john_smith', 'John Smith', NULL, '{white}', 'man', false, NULL, NULL, '35-44', 'public', true, 0, 0, '2025-07-24 23:10:21.184911+00', '2025-07-24 23:10:21.184911+00'),
	('27c819f4-742a-40e5-83f4-a86d9f2b25dd', 'test_user', 'Test User', NULL, '{white,Asian}', 'Female', true, '{None}', 'Muslim', '25-34', 'public', true, 0, 0, '2025-07-24 23:10:21.184911+00', '2025-07-25 10:48:22.394517+00'),
	('fd5aa6d0-3b0b-4eb1-bd79-16282ececb7d', 'fatima_alrashid', 'Fatima Al-Rashid', NULL, '{middle_eastern}', 'woman', false, NULL, 'islam', '28-35', 'public', true, 0, 0, '2025-07-24 23:10:21.184911+00', '2025-07-24 23:10:21.184911+00'),
	('bff9a0b4-c4bf-44af-b946-0925a7813778', 'alex_thompson', 'Alex Thompson', NULL, '{white}', 'non-binary', true, NULL, NULL, '24-31', 'public', true, 0, 0, '2025-07-24 23:10:21.184911+00', '2025-07-24 23:10:21.184911+00'),
	('43ad6c42-21fa-4e47-ac55-0c8004706f9a', 'sofia_gonzalez', 'Sofia Gonzalez', NULL, '{hispanic_latino}', 'woman', false, NULL, NULL, '35-42', 'public', true, 0, 0, '2025-07-24 23:10:21.184911+00', '2025-07-24 23:10:21.184911+00'),
	('d6e0b882-d8d6-4443-b5c3-1e18eab1a7a1', 'david_kim', 'David Kim', NULL, '{asian}', 'man', true, NULL, NULL, '26-33', 'public', true, 0, 0, '2025-07-24 23:10:21.184911+00', '2025-07-24 23:10:21.184911+00'),
	('2713d912-0fa8-4905-b0ec-6699f6946e89', 'emma_chen', 'Emma Chen', NULL, '{asian}', 'woman', false, NULL, NULL, '30-39', 'public', true, 0, 0, '2025-07-24 23:10:21.184911+00', '2025-07-24 23:10:21.184911+00'),
	('fa1cb7a2-3b20-4d6d-9643-8a4477735275', 'marcus_washington', 'Marcus Washington', NULL, '{black}', 'man', false, NULL, NULL, '45-54', 'public', true, 0, 0, '2025-07-24 23:10:21.184911+00', '2025-07-24 23:10:21.184911+00'),
	('6cb20cc1-1bf2-41c5-bdba-c5ce76ef4859', 'aisha_patel', 'Aisha Patel', NULL, '{south_asian}', 'woman', false, NULL, 'islam', '22-29', 'public', true, 0, 0, '2025-07-24 23:10:21.184911+00', '2025-07-24 23:10:21.184911+00'),
	('afcc06cb-fcd0-450a-a573-380eb4ab7581', 'maya_johnson', 'Maya Johnson', 'https://jglobmuqzqzfcwpifocz.supabase.co/storage/v1/object/public/user-avatars/avatars/afcc06cb-fcd0-450a-a573-380eb4ab7581-1753536035766.jpg', '{black,"Black/African American"}', 'Female', false, '{Hearing}', 'Christian', '35-44', 'public', true, 0, 0, '2025-07-24 23:10:21.184911+00', '2025-07-26 13:20:39.338013+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id") VALUES
	('user-avatars', 'user-avatars', NULL, '2025-07-26 12:42:33.523957+00', '2025-07-26 12:42:33.523957+00', true, false, NULL, NULL, NULL);


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") VALUES
	('1c4f889f-e6ac-4fc4-9aae-a4f0ee2c4bc8', 'user-avatars', 'avatars/afcc06cb-fcd0-450a-a573-380eb4ab7581-1753534816570.jpg', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '2025-07-26 13:00:17.827754+00', '2025-07-26 13:00:17.827754+00', '2025-07-26 13:00:17.827754+00', '{"eTag": "\"d41d8cd98f00b204e9800998ecf8427e\"", "size": 0, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-07-26T13:00:18.000Z", "contentLength": 0, "httpStatusCode": 200}', 'e36da7ef-6217-4dd7-b2c8-2c9af01bd8f3', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '{}'),
	('5bb66e75-a804-4ecd-96f2-5bf9afc1d132', 'user-avatars', 'avatars/afcc06cb-fcd0-450a-a573-380eb4ab7581-1753535551620.jpg', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '2025-07-26 13:12:32.461206+00', '2025-07-26 13:12:32.461206+00', '2025-07-26 13:12:32.461206+00', '{"eTag": "\"d41d8cd98f00b204e9800998ecf8427e\"", "size": 0, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-07-26T13:12:33.000Z", "contentLength": 0, "httpStatusCode": 200}', 'bbd8576f-d973-4d0d-bc31-f2cf11a362e9', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '{}'),
	('fb1d4fec-a707-4c5e-8631-8afa45c4bf60', 'user-avatars', 'avatars/afcc06cb-fcd0-450a-a573-380eb4ab7581-1753535633366.jpg', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '2025-07-26 13:13:54.048516+00', '2025-07-26 13:13:54.048516+00', '2025-07-26 13:13:54.048516+00', '{"eTag": "\"d41d8cd98f00b204e9800998ecf8427e\"", "size": 0, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-07-26T13:13:55.000Z", "contentLength": 0, "httpStatusCode": 200}', '03e7907b-ba17-45ee-ace2-7344ca36471d', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '{}'),
	('b645d287-e048-48d7-ac90-a1887b91fa1d', 'user-avatars', 'avatars/afcc06cb-fcd0-450a-a573-380eb4ab7581-1753536035766.jpg', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '2025-07-26 13:20:38.826604+00', '2025-07-26 13:20:38.826604+00', '2025-07-26 13:20:38.826604+00', '{"eTag": "\"526823eec7c48cec3924cf154e150d75\"", "size": 1280723, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-07-26T13:20:39.000Z", "contentLength": 1280723, "httpStatusCode": 200}', '5ea4c34f-ee59-4e4f-893a-7fa73fff7da2', 'afcc06cb-fcd0-450a-a573-380eb4ab7581', '{}');


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 101, true);


--
-- PostgreSQL database dump complete
--

RESET ALL;
