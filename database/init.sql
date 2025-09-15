--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg120+1)
-- Dumped by pg_dump version 16.9 (Debian 16.9-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: vision_data; Type: TABLE; Schema: public; Owner: vision_user
--

CREATE TABLE public.vision_data (
    user_id character varying(50) NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.vision_data OWNER TO vision_user;

--
-- Data for Name: vision_data; Type: TABLE DATA; Schema: public; Owner: vision_user
--

COPY public.vision_data (user_id, data, updated_at) FROM stdin;
1       [{"leftEye": {"logMARScore": -0.29, "totalLetters": 21, "correctLetters": 13, "attemptedLetters": 21, "startedTimestamp": 1754855530387, "completedTimestamp": 1754855642183}, "rightEye": {"logMARScore": -0.208, "totalLetters": 15, "correctLetters": 7, "attemptedLetters": 15, "startedTimestamp": 1754855646406, "completedTimestamp": 1754855791135}, "pixelsPerCm": 43.47826086956522, "distanceCentimeters": 355.3, "viewingConfigurationName": "Dad's living room (2025-08)"}, {"leftEye": {"logMARScore": -0.256, "totalLetters": 15, "correctLetters": 9, "attemptedLetters": 15, "startedTimestamp": 1755003099575, "completedTimestamp": 1755003237134}, "rightEye": {"logMARScore": -0.257, "totalLetters": 15, "correctLetters": 9, "attemptedLetters": 15, "startedTimestamp": 1755003241937, "completedTimestamp": 1755003351526}, "pixelsPerCm": 43.47826086956522, "distanceCentimeters": 458.2, "viewingConfigurationName": "Home Office"}, {"leftEye": {"logMARScore": -0.375, "totalLetters": 18, "correctLetters": 13, "attemptedLetters": 18, "startedTimestamp": 1755433078546, "completedTimestamp": 1755433201941}, "rightEye": {"logMARScore": -0.27, "totalLetters": 24, "correctLetters": 16, "attemptedLetters": 24, "startedTimestamp": 1755433207031, "completedTimestamp": 1755433432173}, "pixelsPerCm": 43.47826086956522, "distanceCentimeters": 458.2, "viewingConfigurationName": "Home Office"}, {"leftEye": {"logMARScore": -0.336, "totalLetters": 15, "correctLetters": 10, "attemptedLetters": 15, "startedTimestamp": 1755525707093, "completedTimestamp": 1755525862649}, "rightEye": {"logMARScore": -0.325, "totalLetters": 15, "correctLetters": 12, "attemptedLetters": 15, "startedTimestamp": 1755525867771, "completedTimestamp": 1755525953770}, "pixelsPerCm": 43.47826086956522, "distanceCentimeters": 458.2, "viewingConfigurationName": "Home Office"}, {"leftEye": {"logMARScore": -0.341, "totalLetters": 15, "correctLetters": 9, "attemptedLetters": 15, "startedTimestamp": 1755607689571, "completedTimestamp": 1755607811460}, "rightEye": {"logMARScore": -0.246, "totalLetters": 15, "correctLetters": 9, "attemptedLetters": 15, "startedTimestamp": 1755607816488, "completedTimestamp": 1755607980144}, "pixelsPerCm": 43.47826086956522, "distanceCentimeters": 458.2, "viewingConfigurationName": "Home Office"}, {"leftEye": {"logMARScore": -0.307, "totalLetters": 21, "correctLetters": 15, "attemptedLetters": 21, "startedTimestamp": 1756296343317, "completedTimestamp": 1756296457986}, "rightEye": {"logMARScore": -0.279, "totalLetters": 30, "correctLetters": 17, "attemptedLetters": 30, "startedTimestamp": 1756296463012, "completedTimestamp": 1756296750020}, "pixelsPerCm": 43.47826086956522, "distanceCentimeters": 458.2, "viewingConfigurationName": "Home Office"}, {"leftEye": {"logMARScore": -0.353, "totalLetters": 33, "correctLetters": 27, "attemptedLetters": 33, "startedTimestamp": 1756382347699, "completedTimestamp": 1756382614424}, "rightEye": {"logMARScore": -0.162, "totalLetters": 27, "correctLetters": 20, "attemptedLetters": 27, "startedTimestamp": 1756382619483, "completedTimestamp": 1756382787540}, "pixelsPerCm": 43.47826086956522, "distanceCentimeters": 458.2, "viewingConfigurationName": "Home Office"}, {"leftEye": {"logMARScore": -0.224, "totalLetters": 21, "correctLetters": 14, "attemptedLetters": 21, "startedTimestamp": 1756815599845, "completedTimestamp": 1756815726518}, "rightEye": {"logMARScore": -0.295, "totalLetters": 27, "correctLetters": 19, "attemptedLetters": 27, "startedTimestamp": 1756815734987, "completedTimestamp": 1756815888926}, "pixelsPerCm": 43.47826086956522, "distanceCentimeters": 458.2, "viewingConfigurationName": "Home Office"}]       2025-09-02 12:24:48.940396+00
\.


--
-- Name: vision_data vision_data_pkey; Type: CONSTRAINT; Schema: public; Owner: vision_user
--

ALTER TABLE ONLY public.vision_data
    ADD CONSTRAINT vision_data_pkey PRIMARY KEY (user_id);


--
-- PostgreSQL database dump complete
--
