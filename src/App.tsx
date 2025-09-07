import { type ChangeEvent, type SyntheticEvent, useRef, useState } from "react";

import "./App.css";
import {
  allowedContentIDSources,
  type ContentIDSource,
  type Tag,
  TagStore,
} from "./TagStore";
import type { ValidateData } from "./types/types-helpers";
import { validateString } from "./validators/string";

interface FocusEvent<T = Element> extends SyntheticEvent<T> {
  relatedTarget: EventTarget | null;
  target: EventTarget & T;
}

export function App() {
  const contentIDRef = useRef<HTMLInputElement>(null);

  const [contentIDSource, setContentIDSource] = useState<ContentIDSource>();
  function resetContentIDSource() {
    setContentIDSource(undefined);
  }
  function contentIDSourceRadioButtonOnChangeHandler(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const newValue = event.target.value as typeof contentIDSource;
    setContentIDSource(() => newValue);
  }

  function contentIDOnBlurHandler(event: FocusEvent<HTMLInputElement>) {
    const newValue = event.target.value;
    if (newValue.startsWith("https://www.instagram.com/p/")) {
      let instagramID = newValue.split("https://www.instagram.com/p/")[1];
      if (instagramID.endsWith("/")) {
        instagramID = instagramID.split("/")[0];
      }
      if (instagramID.length === 0) {
        return;
      }
      contentIDRef.current!.value = instagramID;
      setContentIDSource("instagram");
    } else if (
      newValue.startsWith("https://x.com/") &&
      newValue.includes("/status/")
    ) {
      const splitParts = newValue.split("/");
      const splitPartsCount = splitParts.length;
      if (splitPartsCount < 6 || splitPartsCount > 7) {
        return;
      }
      const twitterID =
        splitPartsCount === 7
          ? splitParts[splitPartsCount - 2]
          : splitParts[splitPartsCount - 1];
      contentIDRef.current!.value = twitterID;
      setContentIDSource("twitter");
    }
  }

  const contentTagsStringRef = useRef<HTMLInputElement>(null);

  const tagStoreRef = useRef<TagStore>(null);
  if (tagStoreRef.current === null) {
    tagStoreRef.current = new TagStore();
  }
  const [allTagsStored, setAllTagsStored] = useState<Array<Tag>>(() =>
    tagStoreRef.current!.getAllTags()
  );

  const [contentTagsAutoSuggestions, setContentTagsAutoSuggestions] = useState<
    Array<string>
  >([]);
  function resetContentTagsAutoSuggestions() {
    setContentTagsAutoSuggestions([]);
  }
  const contentTagsOnChangeHandler = (event: ChangeEvent<HTMLInputElement>) => {
    resetContentTagsAutoSuggestions();
    const newValue = event.target.value;
    let tag: string = newValue.trim();
    if (newValue.includes(",")) {
      console.log("[contentTagsOnChangeHandler] newValue", newValue);
      const validation = validateContentTags(newValue);
      console.log("[contentTagsOnChangeHandler] validation", validation);
      if (!validation.success) {
        return;
      }
      const tags = validation.data;
      console.log("[contentTagsOnChangeHandler] tags", tags);
      const outerMostTag = tags[tags.length - 1];
      tag = outerMostTag;
    }
    console.log("[contentTagsOnChangeHandler] tag", tag);
    const suggestions = tagStoreRef.current!.suggest(tag);
    console.log("[contentTagsOnChangeHandler] suggestions", suggestions);
    setContentTagsAutoSuggestions(() => suggestions);
  };

  const [selectedContentTags, setSelectedContentTags] = useState<Set<string>>(
    new Set()
  );
  function resetSelectedContentTags() {
    setSelectedContentTags(new Set());
  }

  function validateContentID(contentID: string): ValidateData<string> {
    return validateString(contentID, {
      key: "contentID",
    });
  }

  function validateContentTags(tagsStr: string): ValidateData<Array<string>> {
    const result = validateString(tagsStr, {
      key: "tagsStr",
    });
    if (!result.success) {
      return result;
    }
    const tags = tagsStr.split(",");
    const filteredTagsSet = new Set<string>();
    for (const tag of tags) {
      const tagTrimmed = tag.trim();
      if (tagTrimmed && tag.length > 0 && !filteredTagsSet.has(tagTrimmed)) {
        filteredTagsSet.add(tagTrimmed);
      }
    }
    if (!filteredTagsSet.size) {
      return {
        success: false,
        error: {
          message:
            "tags must be a valid Array<string> & each string must be of length > 0",
        },
      };
    }
    return {
      success: true,
      data: Array.from(filteredTagsSet),
    };
  }

  const [isButtonDisabled, setButtonDisabled] = useState<boolean>(false);
  function enableButton() {
    setButtonDisabled(false);
  }
  function disableButton() {
    setButtonDisabled(true);
  }

  function resetAllStateAndRefs() {
    contentIDRef.current!.value = "";
    contentTagsStringRef.current!.value = "";
    enableButton();
    resetContentIDSource();
    resetContentTagsAutoSuggestions();
    resetSelectedContentTags();
  }

  function buttonOnClickHandler() {
    resetContentTagsAutoSuggestions();
    disableButton();
    const contentIDValidation = validateContentID(contentIDRef.current!.value);
    if (!contentIDValidation.success) {
      alert(contentIDValidation.error.message);
      enableButton();
      return;
    }
    if (!allowedContentIDSources.has(contentIDSource!)) {
      alert("ContentIDSource must be valid");
      enableButton();
      return;
    }
    const contentTagsValidation = validateContentTags(
      contentTagsStringRef.current!.value
    );

    const contentID = contentIDValidation.data;
    let contentTags: Array<string> = [];
    if (contentTagsValidation.success) {
      contentTags = [...contentTags, ...contentTagsValidation.data];
    }
    if (selectedContentTags.size) {
      contentTags = [...contentTags, ...[...selectedContentTags]];
    }
    if (!contentTags.length) {
      alert("At least 1 selected content tag must be present!");
      enableButton();
      return;
    }

    tagStoreRef.current!.addTags(contentTags, contentID, contentIDSource!);

    resetAllStateAndRefs();
    setAllTagsStored(() => tagStoreRef.current!.getAllTags());
  }

  function handleContentTagSuggestionClick(suggestion: string) {
    contentTagsStringRef.current!.value = "";
    resetContentTagsAutoSuggestions();
    setSelectedContentTags((prev) => {
      const current = new Set(prev);
      current.add(suggestion);
      return current;
    });
  }

  return (
    <>
      <h1>Bookmarks Manager</h1>
      <section className="flex column justify-content-between gap-8">
        <section className="flex row justify-content-between gap-8">
          <fieldset className="flex row justify-content-between gap-8">
            <label htmlFor="contentID">ContentID</label>
            <input
              type="text"
              id="contentID"
              ref={contentIDRef}
              onBlur={contentIDOnBlurHandler}
            />
          </fieldset>
          <fieldset>
            <section className="flex row justify-content-between gap-8">
              <input
                type="radio"
                id="contentIDSourceInstagram"
                checked={contentIDSource === "instagram"}
                onChange={contentIDSourceRadioButtonOnChangeHandler}
              />
              <label htmlFor="contentIDSourceInstagram">Instagram</label>
            </section>
            <section className="flex row justify-content-between gap-8">
              <input
                type="radio"
                id="contentIDSourceTwitter"
                checked={contentIDSource === "twitter"}
                onChange={contentIDSourceRadioButtonOnChangeHandler}
              />
              <label htmlFor="contentIDSourceTwitter">Twitter</label>
            </section>
          </fieldset>

          {/* Tags input section with vertical suggestions */}
          <fieldset>
            <section className="flex column gap-8">
              <section className="flex row gap-8">
                <label htmlFor="tags">Tags (comma separated)</label>
                <input
                  type="text"
                  id="tags"
                  ref={contentTagsStringRef}
                  onChange={contentTagsOnChangeHandler}
                />
              </section>

              {/* Auto suggestions - vertically below the input */}
              {contentTagsAutoSuggestions.length > 0 && (
                <section className="flex column gap-4">
                  <label>Suggestions:</label>
                  {contentTagsAutoSuggestions.map((suggestion) => (
                    <div
                      key={suggestion}
                      className="bg-grey-1 spacing-8 border-2 border-color-grey-1 border-radius-8 cursor-pointer"
                      onClick={() =>
                        handleContentTagSuggestionClick(suggestion)
                      }
                    >
                      {suggestion}
                    </div>
                  ))}
                </section>
              )}
            </section>
          </fieldset>

          <button disabled={isButtonDisabled} onClick={buttonOnClickHandler}>
            Add ContentID with Tags
          </button>
        </section>

        {/* Selected tags section */}
        {selectedContentTags.size ? (
          <section className="flex row align-items-center gap-8">
            <label htmlFor="suggestionsSelected">Selected</label>
            <section className="flex row align-items-center gap-8">
              {[...selectedContentTags].map((suggestion) => {
                return (
                  <div
                    key={suggestion}
                    className="bg-green-1 spacing-8 border-2 border-color-grey-1 border-radius-8 cursor-pointer"
                    onClick={() => {
                      if (confirm("Are you sure you want to remove it?")) {
                        setSelectedContentTags((prev) => {
                          const current = new Set(prev);
                          current.delete(suggestion);
                          return current;
                        });
                      }
                    }}
                  >
                    {suggestion}
                  </div>
                );
              })}
            </section>
          </section>
        ) : null}

        {allTagsStored.length ? (
          <section className="flex column gap-8">
            <label htmlFor="allTagsStored">All Tags Stored</label>
            <div
              className="max-height-400 flex column gap-8"
              style={{
                flexDirection: "row",
                maxWidth: "1000px",
                maxHeight: "400px",
                overflowY: "auto",
                flexWrap: "wrap",
                // border: "3px solid red",
                // backgroundColor: "yellow",
              }}
            >
              {allTagsStored.map((tag) => {
                return (
                  <div
                    key={tag.name}
                    className="bg-green-1 spacing-8 border-2 border-color-grey-1 border-radius-8 cursor-pointer"
                    style={{
                      backgroundColor: "#38AC5F",
                      alignSelf: "baseline",
                      padding: "8px",
                      border: "2px solid #CBCBCB",
                      color: "#FFFFFF",
                    }}
                    onClick={() => handleContentTagSuggestionClick(tag.name)}
                  >
                    {tag.name} ({Object.keys(tag.contentIds).length})
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </section>
    </>
  );
}
